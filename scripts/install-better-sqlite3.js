#!/usr/bin/env node
/**
 * Downloads the prebuilt better-sqlite3 binary for Electron ABI 139 (Electron 38).
 * Bypasses node-gyp which fails when the path contains spaces on Windows.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = '12.9.0';
const ABI = '139';
const URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${VERSION}/better-sqlite3-v${VERSION}-electron-v${ABI}-win32-x64.tar.gz`;
const TARGET = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
const TMPGZ = path.join(__dirname, '..', 'bsq3-tmp.tar.gz');
const TMPDIR = path.join(__dirname, '..', 'bsq3-tmp-extract');

// Already correct size? (~1917440 bytes for Electron ABI 139)
if (fs.existsSync(TARGET)) {
    const size = fs.statSync(TARGET).size;
    if (size >= 1917000 && size <= 1920000) {
        console.log('[better-sqlite3] Electron ABI 139 binary already installed.');
        process.exit(0);
    }
}

console.log('[better-sqlite3] Installing prebuilt Electron ABI 139 binary...');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = (u) => https.get(u, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) { req(res.headers.location); return; }
            if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
        req(url);
    });
}

function findNode(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { const r = findNode(full); if (r) return r; }
        else if (e.name.endsWith('.node')) return full;
    }
    return null;
}

(async () => {
    try {
        await download(URL, TMPGZ);
        if (fs.existsSync(TMPDIR)) fs.rmSync(TMPDIR, { recursive: true, force: true });
        fs.mkdirSync(TMPDIR);
        execSync(`tar -xzf "${TMPGZ}" -C "${TMPDIR}"`, { stdio: 'pipe' });
        const bin = findNode(TMPDIR);
        if (!bin) throw new Error('.node binary not found in archive');
        const dir = path.dirname(TARGET);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        // Use rename trick to avoid EBUSY on locked files
        const bak = TARGET + '.bak';
        try { if (fs.existsSync(bak)) fs.unlinkSync(bak); } catch { }
        try { if (fs.existsSync(TARGET)) fs.renameSync(TARGET, bak); } catch { }
        fs.copyFileSync(bin, TARGET);
        try { if (fs.existsSync(bak)) fs.unlinkSync(bak); } catch { }
        console.log('[better-sqlite3] ✓ Installed successfully.');
    } catch (e) {
        console.error('[better-sqlite3] Failed:', e.message);
        process.exit(1);
    } finally {
        try { if (fs.existsSync(TMPGZ)) fs.unlinkSync(TMPGZ); } catch { }
        try { if (fs.existsSync(TMPDIR)) fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch { }
    }
})();
