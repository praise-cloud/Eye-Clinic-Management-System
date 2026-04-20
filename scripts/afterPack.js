// scripts/afterPack.js
// Runs after electron-builder packs the app.
// electron-builder already installs the prebuilt better-sqlite3 binary
// via asarUnpack + install-app-deps, so nothing extra needed here.

exports.default = async function afterPack(context) {
  console.log('[AfterPack] Pack complete for:', context?.packager?.appInfo?.productName || 'app');
};
