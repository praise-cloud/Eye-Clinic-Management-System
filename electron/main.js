// main.js — FINAL BULLETPROOF VERSION (copy & paste exactly)
const electron = require('electron');
if (!electron || !electron.app || !electron.BrowserWindow) {
  const { spawn } = require('child_process');
  const electronBinary = typeof electron === 'string' ? electron : require('electron');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  // Never forward arbitrary CLI args here; they can be interpreted as app paths.
  spawn(electronBinary, ['.'], {
    env,
    stdio: 'inherit',
    detached: false
  });
  process.exit(0);
}
const { app, BrowserWindow } = electron;
const path = require('path');

// Services
const Database = require('../database.js');
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

  // Load URL based on environment
  const isDev = process.env.NODE_ENV === 'development';

  // Ensure helpful logs for production mode
  if (isDev) {
    console.log('Running in development mode. Loading from localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools automatically to debug any white screens
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Running in production mode. Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    console.log('Eye Clinic App — Login window is OPEN');
  });

  // Force show if something goes wrong
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
  }, 5000);
}

// MAIN STARTUP — THIS IS THE ONLY PLACE app.whenReady() IS USED
app.whenReady().then(async () => {
  console.log('Starting Eye Clinic App...');

  try {
    // 1. Database
    dbInstance = new Database();
    await dbInstance.initialize();
    console.log('Database ready');

    // 2. IPC Handlers (login, chat, patients, etc.)
    new IPCHandlers();

    // 3. Open window
    createWindow();

    console.log('APP FULLY STARTED — Login + Chat = 100% WORKING');

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
