const electron = require('electron');
if (!electron || !electron.app || !electron.BrowserWindow) {
  const { spawn } = require('child_process');
  const electronBinary = typeof electron === 'string' ? electron : require('electron');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  spawn(electronBinary, ['.'], {
    env,
    stdio: 'inherit',
    detached: false
  });
  process.exit(0);
}
const { app, BrowserWindow } = electron;
const path = require('path');
const fs = require('fs');
const Database = require('../database.js');
const ServerManager = require('./server/ServerManager');
const IPCHandlers = require('./ipc/handlers');

let mainWindow = null;
let dbInstance = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    console.log('Running in development mode. Loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Running in production mode. Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    console.log('Eye Clinic App — Login window is OPEN');
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }, 5000);
}

const DEFAULT_CONFIG = {
  isServerMode: false,
  serverUrl: '',
  serverPort: 3001,
  sql_server: {
    enabled: false,
    host: 'localhost',
    port: 1433,
    database: 'eye_clinic_db',
    user: '',
    password: '',
    encrypt: true,
    trustServerCertificate: true
  }
};

function loadConfig() {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  try {
    if (fs.existsSync(configPath)) {
      const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...DEFAULT_CONFIG, ...loaded };
    }
  } catch (e) {
    console.warn('[Main] Could not read config:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[Main] Could not save config:', e.message);
    return false;
  }
}

app.whenReady().then(async () => {
  console.log('Starting Eye Clinic App...');

  try {
    console.log('Initializing database...');
    dbInstance = new Database();
    await dbInstance.initialize();
    console.log('Database ready at:', dbInstance.dbPath);

    const config = loadConfig();
    if (config.isServerMode) {
      console.log('[Main] Server mode enabled, starting server...');
      ServerManager.initialize(dbInstance);
      await ServerManager.start({ port: config.serverPort || 3001 });
      console.log('[Main] Server started successfully');
    }

    new IPCHandlers({ config, saveConfig, loadConfig, serverManager: ServerManager });

    createWindow();

    console.log('APP FULLY STARTED');

  } catch (err) {
    console.error('FATAL ERROR:', err);
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
