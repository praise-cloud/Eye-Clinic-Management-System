// electron/main.js
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
let authWindow = null;
let database = null;
let currentUser = null;

// ── Load config ────────────────────────────────────────────────
function loadConfig() {
  const fs = require('fs');
  const cfgPath = path.join(app.getPath('userData'), 'config.json');
  try {
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch (e) {
    console.warn('[Config] Could not load config:', e.message);
  }
  return { isServerMode: false, serverUrl: '', serverPort: 3001 };
}

// ── Database init (standalone mode only) ──────────────────────
async function initializeDatabase() {
  const config = loadConfig();

  // Skip SQLite if in server/client mode
  if (config.serverUrl || config.isServerMode) {
    console.log('[Main] Server mode — skipping SQLite init');
    return;
  }

  try {
    const Database = require('../database');
    database = new Database();
    await database.initialize();
    console.log('[Main] SQLite ready');
  } catch (error) {
    console.error('[Main] Database init failed:', error);
    dialog.showErrorBox(
      'Database Error',
      'Could not initialize local database.\n\n' + error.message +
      '\n\nIf you are connecting to a server, please configure your server URL in Settings.'
    );
    // Don't quit — allow server mode config
  }
}

// ── Windows ───────────────────────────────────────────────────
function getWebPreferences() {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  };
}

function loadURL(win) {
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function loadAuthURL(win) {
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function createAuthWindow() {
  authWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: getWebPreferences(),
    show: false,
    resizable: true,
    frame: true
  });

  loadAuthURL(authWindow);
  authWindow.once('ready-to-show', () => authWindow.show());

  if (process.env.NODE_ENV === 'development') {
    authWindow.webContents.openDevTools();
  }

  authWindow.on('closed', () => {
    authWindow = null;
    if (!mainWindow) app.quit();
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: getWebPreferences(),
    show: false
  });

  loadURL(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (authWindow && !authWindow.isDestroyed()) authWindow.close();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC: expose db and user to handlers ──────────────────────
function buildContext() {
  const config = loadConfig();
  return {
    config,
    saveConfig: (newConfig) => {
      const fs = require('fs');
      const cfgPath = path.join(app.getPath('userData'), 'config.json');
      try {
        fs.writeFileSync(cfgPath, JSON.stringify({ ...loadConfig(), ...newConfig }, null, 2));
      } catch (e) {
        console.warn('[Config] Could not save config:', e.message);
      }
    },
    getDatabase: () => database,
    getCurrentUser: () => currentUser,
    setCurrentUser: (u) => { currentUser = u; },
    getConfig: () => config,
    getMainWindow: () => mainWindow,
    getAuthWindow: () => authWindow,
    openMainWindow: createMainWindow,
    openAuthWindow: createAuthWindow,
  };
}

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(async () => {
  await initializeDatabase();

  // Register IPC handlers — pass context so handlers can access db
  try {
    const IPCHandlers = require('./ipc/handlers');
    new IPCHandlers(buildContext());
  } catch (err) {
    console.error('[Main] IPC handlers failed to load:', err);
  }

  // Decide which window to open
  let isFirstRun = true;
  if (database) {
    try {
      isFirstRun = await database.isFirstRun();
    } catch (e) {
      console.warn('[Main] isFirstRun check failed:', e.message);
    }
  }

  if (isFirstRun && !loadConfig().serverUrl) {
    createAuthWindow();
  } else {
    createAuthWindow(); // Always start at auth/login
  }

  createAppMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (database) database.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createAuthWindow();
});

app.on('before-quit', () => {
  if (database) database.close();
});

// ── Safe broadcast helper ─────────────────────────────────────
function broadcastToAll(channel, data) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

// Export for use in IPC handlers
module.exports = { broadcastToAll };

// ── App Menu ─────────────────────────────────────────────────
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Logout',
          click: () => {
            currentUser = null;
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
            createAuthWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About KORENE Eye Clinic',
          click: () => dialog.showMessageBox({
            type: 'info',
            title: 'KORENE Eye Clinic',
            message: 'KORENE Eye Clinic Management System\nVersion 1.0.0'
          })
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}