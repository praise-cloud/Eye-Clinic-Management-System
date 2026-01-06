const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('./database');
const IPCHandlers = require('./services/IPCHandlers');
const SyncService = require('./src/services/SyncService');
const db = require('./database');


// ✅ Add this right after imports
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

// Initialize database on app start
async function initializeDatabase() {
  try {
    database = new Database();
    await database.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dialog.showErrorBox('Database Error', 'Failed to initialize database. The application will exit.');
    app.quit();
  }
}

// function createAuthWindow() {
//   authWindow = new BrowserWindow({
//     width: 1200,
//     height: 900,
//     webPreferences: {
//       nodeIntegration: false,
//       contextIsolation: true,
//       preload: path.join(__dirname, 'preload.js')
//     },
//     show: false,
//     resizable: false,
//     titleBarStyle: 'hidden',
//     frame: true
//   });

//   // Load from Vite dev server in development, dist in production
//   if (process.env.NODE_ENV === 'development') {
//     authWindow.loadURL('http://localhost:3000/auth.html');
//   } else {
//     authWindow.loadFile(path.join(__dirname, 'dist/auth.html'));
//   }

//   authWindow.once('ready-to-show', () => {
//     authWindow.show();
//   });

//   // Open DevTools in development
//   if (process.env.NODE_ENV === 'development') {
//     authWindow.webContents.openDevTools();
//   }

//   authWindow.on('closed', () => {
//     authWindow = null;
//     if (!mainWindow) {
//       app.quit();
//     }
//   });
// }

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
    authWindow.loadURL('http://localhost:3000/auth.html'); // 🔑 new signup page
  } else {
    authWindow.loadFile(path.join(__dirname, 'dist/auth.html'));
  }

  authWindow.once('ready-to-show', () => {
    authWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    authWindow.webContents.openDevTools();
  }

  authWindow.on('closed', () => {
    authWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}

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
    authWindow.loadURL('http://localhost:3000/auth.html'); // 🔑 new login page
  } else {
    authWindow.loadFile(path.join(__dirname, 'dist/auth.html'));
  }

  authWindow.once('ready-to-show', () => {
    authWindow.show();
  });

  if (process.env.NODE_ENV === 'development') {
    authWindow.webContents.openDevTools();
  }

  authWindow.on('closed', () => {
    authWindow = null;
    if (!mainWindow) {
      app.quit();
    }
  });
}


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

  // Load from Vite dev server in development, dist in production
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000/index.html');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Close auth window if it exists
    if (authWindow) {
      authWindow.close();
    }
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app when ready
app.whenReady().then(async () => {
  await initializeDatabase();
  
  // Initialize sync service
  await SyncService.initialize();
  SyncService.startAutoSync(5);
  
  // Setup real-time chat listener
  setupChatListener();

  // Initialize comprehensive IPC handlers
  new IPCHandlers();

  // Also keep essential window management handlers
  // setupWindowHandlers();

  // Check if first run to determine which window to show
  const isFirstRun = await database.isFirstRun();
  if (isFirstRun) {
    createSignupWindow();
  } else {
    createLoginWindow();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (database) {
      database.close();
    }
    SyncService.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAuthWindow();
  }
});

app.on('before-quit', () => {
  if (database) {
    database.close();
  }
  SyncService.close();
});

// Setup Window Management and Auth handlers (for current user state)
function setupWindowHandlers() {
  // Authentication handlers that manage currentUser state
  ipcMain.handle('auth:isFirstRun', async () => {
    try {
      return await database.isFirstRun();
    } catch (error) {
      console.error('Error checking first run:', error);
      return true;
    }
  });

  ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
      const user = await database.authenticateUser(email, password);
      if (user) {
        currentUser = user;
        return { success: true, user };
      } else {
        return { success: false, message: 'Invalid email or password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    currentUser = null;
    return { success: true };
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    return currentUser;
  });

  ipcMain.handle('auth:createUser', async (event, userData) => {
    try {
      const user = await database.createUser(userData);
      return { success: true, user };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('auth:completeSetup', async (event, { clinicData, adminData }) => {
    try {
      // Save clinic settings
      await database.setSetting('clinic_name', clinicData.name);
      await database.setSetting('clinic_address', clinicData.address);
      await database.setSetting('clinic_phone', clinicData.phone);
      await database.setSetting('setup_completed', 'true');

      // Create admin user
      const user = await database.createUser(adminData);
      currentUser = user;

      return { success: true, user };
    } catch (error) {
      console.error('Setup error:', error);
      return { success: false, message: error.message };
    }
  });

  // Window management handlers
  ipcMain.handle('window:openMain', async () => {
    if (!mainWindow) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
    return { success: true };
  });

  ipcMain.handle('window:closeAuth', async () => {
    if (authWindow) {
      authWindow.close();
    }
    return { success: true };
  });

  // Settings handlers
  ipcMain.handle('db:getSettings', async () => {
    try {
      const settings = {};
      const keys = ['clinic_name', 'clinic_address', 'clinic_phone'];
      for (const key of keys) {
        settings[key] = await database.getSetting(key);
      }
      return { success: true, settings };
    } catch (error) {
      console.error('Get settings error:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('db:setSetting', async (event, { key, value }) => {
    try {
      await database.setSetting(key, value);
      return { success: true };
    } catch (error) {
      console.error('Set setting error:', error);
      return { success: false, message: error.message };
    }
  });
}

// Create application menu
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Patient',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:newPatient');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          click: () => {
            currentUser = null;
            if (mainWindow) {
              mainWindow.close();
            }
            createAuthWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
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
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Eye Clinic',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Eye Clinic Management System',
              message: 'Eye Clinic Management System',
              detail: 'Version 1.0.0\nVisual Field Test Management for Medical Professionals'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Setup chat listener for real-time updates
function setupChatListener() {
  const db = new Database();
  
  // Listen for new chat messages from database
  setInterval(async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        // This will be triggered by Supabase real-time subscription
        // The actual listening happens in SyncService
      } catch (error) {
        console.error('Chat listener error:', error);
      }
    }
  }, 1000);
}

// Set menu after app is ready
app.whenReady().then(() => {
  createAppMenu();
});
