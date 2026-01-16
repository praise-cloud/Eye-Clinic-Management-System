const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('./database');
const IPCHandlers = require('./electron/ipc/handlers');
const SyncService = require('./src/services/SyncService');

// Optional: electron-reload for development
try {
  require('electron-reload')(__dirname, {
    electron: require(`${__dirname}/node_modules/electron`)
  });
} catch (e) {
  console.warn("Electron reload not enabled in production.");
}

let mainWindow = null;
let authWindow = null;
let database = null;
let currentUser = null;
let syncService = null;

// Initialize database
async function initializeDatabase() {
  try {
    database = new Database();
    await database.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database init failed:', error);
    dialog.showErrorBox('Database Error', 'Cannot start app - database failed.');
    app.quit();
  }
}

// Create signup window (first-time setup)
function createSignupWindow() {
  authWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    resizable: false,
    frame: true
  });

  if (process.env.NODE_ENV === 'development') {
    authWindow.loadURL('http://localhost:3000/auth.html');
  } else {
    authWindow.loadFile(path.join(__dirname, 'dist/auth.html'));
  }

  authWindow.once('ready-to-show', () => authWindow.show());

  if (process.env.NODE_ENV === 'development') {
    authWindow.webContents.openDevTools();
  }

  authWindow.on('closed', () => {
    authWindow = null;
    if (!mainWindow) app.quit();
  });
}

// Create login window
function createLoginWindow() {
  authWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    resizable: false,
    frame: true
  });

  if (process.env.NODE_ENV === 'development') {
    authWindow.loadURL('http://localhost:3000/auth.html');
  } else {
    authWindow.loadFile(path.join(__dirname, 'dist/auth.html'));
  }

  authWindow.once('ready-to-show', () => authWindow.show());

  if (process.env.NODE_ENV === 'development') {
    authWindow.webContents.openDevTools();
  }

  authWindow.on('closed', () => {
    authWindow = null;
    if (!mainWindow) app.quit();
  });
}

// Create main app window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000/index.html');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (authWindow) authWindow.close();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App ready
app.whenReady().then(async () => {
  await initializeDatabase();

  // Initialize SyncService once
  syncService = new SyncService();
  await syncService.initialize();
  syncService.startAutoSync(0.5); // Every 30 seconds

  // Register all IPC handlers
  new IPCHandlers();

  // Check first run
  const isFirstRun = await database.isFirstRun();
  if (isFirstRun) {
    createSignupWindow();
  } else {
    createLoginWindow();
  }

  createAppMenu();
});

// Quit when all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (database) database.close();
    if (syncService) syncService.stopAutoSync();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createLoginWindow();
  }
});

app.on('before-quit', () => {
  if (database) database.close();
  if (syncService) syncService.stopAutoSync();
});

// Application Menu
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Patient', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:newPatient') },
        { type: 'separator' },
        { label: 'Logout', click: () => {
          currentUser = null;
          mainWindow?.close();
          createLoginWindow();
        }},
        { type: 'separator' },
        { label: 'Exit', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q', click: () => app.quit() }
      ]
    },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }] },
    { label: 'Help', submenu: [{ label: 'About', click: () => dialog.showMessageBox({ type: 'info', title: 'Eye Clinic', message: 'Version 1.0' }) }] }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}