// scripts/afterPack.js
// Runs after electron-builder packs the app.
// Rebuilds native modules (better-sqlite3) for Electron's Node.js version.

const path = require('path');
const { execSync } = require('child_process');

exports.default = async function afterPack(context) {
  const { electronVersion, packager } = context;
  const platform = context.packager.platform.name || context.packager.platform;

  console.log(`[AfterPack] Rebuilding native modules for Electron ${electronVersion}...`);
  console.log(`[AfterPack] Platform: ${platform}`);
  console.log(`[AfterPack] Output: ${context.packager.outDir}`);

  try {
    // Rebuild better-sqlite3 for the Electron Node.js version
    // This ensures the native addon is compatible with Electron's bundled Node.js
    const nodeGypPath = require.resolve('@electron/rebuild');

    // Use electron-rebuild to rebuild native modules
    execSync(
      `"${process.execPath}" "${nodeGypPath}" --version="${electronVersion}" --force`,
      {
        cwd: context.packager.appInfo.appDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          // Ensure we use the correct Electron headers
          ELECTRON_VERSION: electronVersion,
          npm_config_runtime: 'electron',
          npm_config_target: electronVersion,
          npm_config_dist_url: `https://electronjs.org/headers/node/node-${electronVersion}-headers.gz`
        }
      }
    );

    console.log('[AfterPack] Native modules rebuilt successfully.');
  } catch (err) {
    // Non-fatal: native modules might not be needed or already compatible
    console.warn('[AfterPack] Native module rebuild warning (non-fatal):', err.message);
    console.warn('[AfterPack] Continuing with pack...');
  }
};
