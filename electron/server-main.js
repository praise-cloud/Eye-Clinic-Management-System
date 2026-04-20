// electron/server-main.js
// Electron entry point for KORENE_Server build
// Starts the HTTP/WebSocket server and shows a system tray icon

const { app, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let tray = null;
let serverStarted = false;

// ── Paths ─────────────────────────────────────────────────────
const appDataPath = app.getPath('userData');
const dbFolder = path.join(process.env.APPDATA || os.homedir(), 'KORENE_EyeClinic');
const logsFolder = path.join(dbFolder, 'logs');
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });
if (!fs.existsSync(logsFolder)) fs.mkdirSync(logsFolder, { recursive: true });

// ── Logging ───────────────────────────────────────────────────
const logFile = path.join(logsFolder, `server_${new Date().toISOString().slice(0, 10)}.log`);
function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(logFile, line + '\n'); } catch { }
}

// ── Tray icon (simple colored square) ────────────────────────
function createTrayIcon(color = '#22c55e') {
    // Create a 16x16 PNG programmatically
    const { createCanvas } = (() => { try { return require('canvas'); } catch { return null; } })() || {};
    if (createCanvas) {
        const canvas = createCanvas(16, 16);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(8, 8, 7, 0, Math.PI * 2);
        ctx.fill();
        return nativeImage.createFromBuffer(canvas.toBuffer('image/png'));
    }
    // Fallback: empty image
    return nativeImage.createEmpty();
}

function getLocalIP() {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

function buildTrayMenu(port, clients = 0) {
    const ip = getLocalIP();
    return Menu.buildFromTemplate([
        { label: 'KORENE Server', enabled: false },
        { type: 'separator' },
        { label: `Status: ${serverStarted ? '🟢 ONLINE' : '🔴 STARTING'}`, enabled: false },
        { label: `Port: ${port}`, enabled: false },
        { label: `IP: ${ip}`, enabled: false },
        { label: `Clients: ${clients}`, enabled: false },
        { label: `DB: ${path.join(dbFolder, 'eye_clinic.db').split(path.sep).slice(-2).join(path.sep)}`, enabled: false },
        { type: 'separator' },
        {
            label: 'Open Log File',
            click: () => { require('electron').shell.openPath(logFile); }
        },
        { type: 'separator' },
        {
            label: 'Stop Server & Exit',
            click: () => {
                log('Server stopped by user.');
                app.quit();
            }
        }
    ]);
}

app.whenReady().then(() => {
    app.setAppUserModelId('com.korene.eyeclinic.server');

    // Don't show in taskbar — tray only
    app.dock?.hide();

    // Create tray
    const icon = createTrayIcon('#22c55e');
    tray = new Tray(icon);
    tray.setToolTip('KORENE Server - Starting...');
    tray.setContextMenu(buildTrayMenu(3001, 0));

    log('KORENE Server starting...');

    // Start the server
    try {
        const serverScript = path.join(__dirname, '..', 'scripts', 'start-server.js');
        // We require the server module inline — it starts listening immediately
        // But start-server.js uses process.argv for port, so we set it
        process.argv = [process.argv[0], serverScript, '--port=3001'];
        require(serverScript);

        serverStarted = true;
        const ip = getLocalIP();
        tray.setToolTip(`KORENE Server 🟢 ${ip}:3001`);
        tray.setContextMenu(buildTrayMenu(3001, 0));
        log(`Server online at ${ip}:3001`);
    } catch (err) {
        log(`FATAL: Server failed to start: ${err.message}`);
        tray.setToolTip('KORENE Server ❌ FAILED');
        dialog.showErrorBox('Server Error', `Failed to start server:\n\n${err.message}`);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    // Keep running — server app has no windows
});

app.on('before-quit', () => {
    log('Server shutting down...');
});
