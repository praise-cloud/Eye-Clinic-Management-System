#!/usr/bin/env node
/**
 * Downloads the prebuilt better-sqlite3 binary for Electron.
 * Bypasses node-gyp (which fails when path contains spaces on Windows).
 *
 * Target: better-sqlite3 v12.9.0, Electron ABI 139 (Electron 38), win32 x64
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BETTER_SQLITE3_VERSION = '12.9.0';
const ELECTRON_ABI = '139';
const PLATFORM = 'win32';
const ARCH = 'x64';

const BINARY_URL = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BETTER_SQLITE3_VERSION}/better-sqlite3-v${BETTER_SQLITE3_VERSION}-electron-v${ELECTRON_ABI}-${PLATFORM}-${ARCH}.tar.gz`;
const TARGET_DIR = path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release');
const TARGET_FILE = path.join(TARGET_DIR, 'better_sqlite3.node');
const TEMP_FILE = path.join(__dirname, '..', 'better-sqlite3-prebuilt.tar.gz');

function getCurrentABI() {
    try {
        // Try to load and check if it works with Electron's ABI
        const binary = require(TARGET_FILE);
        return 'unknown';
    } catch (e) {
        const match = e.message && e.message.match(/NODE_MODULE_VERSION (\d+)/);
        return match ? match[1] : 'unknown';
    }
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (u) => {
            https.get(u, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} for ${u}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            }).on('error', reject);
        };
        request(url);
    });
}

async function main() {
    console.log('[better-sqlite3] Checking binary for Electron ABI', ELECTRON_ABI, '...');

    // Check if already correct
    if (fs.existsSync(TARGET_FILE)) {
        try {
            // Quick size check — Electron ABI 139 binary is ~1917440 bytes
            const size = fs.statSync(TARGET_FILE).size;
            if (size > 1900000 && size < 2000000) {
                // Try a quick load test — if it fails with ABI mismatch we need to replace
                try {
                    execSync(`node -e "require('${TARGET_FILE.replace(/\\/g, '\\\\')}')"`, { stdio: 'pipe' });
                    // If we get here it loaded fine for Node — but we need Electron ABI
                    // Check size to determine if it's the Electron build
                    if (size >= 1917000) {
                        console.log('[better-sqlite3] Electron binary already installed (size:', size, 'bytes)');
                        return;
                    }
                } catch { }
            }
        } catch { }
    }

    console.log('[better-sqlite3] Downloading prebuilt binary for Electron', ELECTRON_ABI, '...');
    console.log('[better-sqlite3] URL:', BINARY_URL);

    try {
        await download(BINARY_URL, TEMP_FILE);
        console.log('[better-sqlite3] Downloaded. Extracting...');

        // Ensure target dir exists
        if (!fs.existsSync(TARGET_DIR)) {
            fs.mkdirSync(TARGET_DIR, { recursive: true });
        }

        // Extract using tar
        const extractDir = path.join(__dirname, '..', 'better-sqlite3-extract-tmp');
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
        fs.mkdirSync(extractDir);

        execSync(`tar -xzf "${TEMP_FILE}" -C "${extractDir}"`, { stdio: 'pipe' });

        // Find the .node file
        function findNode(dir) {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) { const r = findNode(full); if (r) return r; }
                else if (entry.name.endsWith('.node')) return full;
            }
            return null;
        }

        const nodeBinary = findNode(extractDir);
        if (!nodeBinary) throw new Error('Could not find .node binary in archive');

        fs.copyFileSync(nodeBinary, TARGET_FILE);
        console.log('[better-sqlite3] ✓ Installed Electron ABI', ELECTRON_ABI, 'binary');

        // Cleanup
        fs.rmSync(extractDir, { recursive: true, force: true });
        fs.unlinkSync(TEMP_FILE);

    } catch (err) {
        console.error('[better-sqlite3] Failed to install prebuilt binary:', err.message);
        console.error('[better-sqlite3] You may need to run: npm run rebuild');
        // Clean up temp files
        try { if (fs.existsSync(TEMP_FILE)) fs.unlinkSync(TEMP_FILE); } catch { }
        process.exit(1);
    }
}

main();
