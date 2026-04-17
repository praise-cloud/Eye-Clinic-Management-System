const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const DatabaseService = require('../../../src/services/DatabaseService');
const FileService = require('../../../src/services/FileService');
const HensonImportService = require('../../../src/services/HensonImportService');
const { buildErrorResponse, safeHandle } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

const analyzeBakFile = async (filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return { success: false, error: 'File path required' };
    if (!fs.existsSync(filePath)) return { success: false, error: 'File does not exist' };

    const stat_info = fs.statSync(filePath);
    const analysis = {
      success: true,
      file: { path: filePath, name: path.basename(filePath), size_bytes: stat_info.size, size_mb: (stat_info.size / (1024 * 1024)).toFixed(2) },
      format_detected: null,
      details: {},
      conversion_triggered: false,
      converted_file: null
    };

    const fileExt = path.extname(filePath).toLowerCase();
    if (fileExt === '.bak') {
      const outputPath = filePath.replace(/\.bak$/i, '.sqlite');
      const pythonScript = path.join(__dirname, '../../../scripts/restore_bak_to_sqlite.py');
      if (!fs.existsSync(pythonScript)) return { success: false, error: 'Conversion script not found' };

      const result = await new Promise((resolve) => {
        const proc = spawn('python', [pythonScript, filePath, outputPath]);
        let stderr = '';
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
          if (code === 0 && fs.existsSync(outputPath)) {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database(outputPath, err => {
              if (err) resolve({ success: false, error: 'Conversion failed: Invalid output file' });
              else {
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                  db.close();
                  resolve(err || !tables?.length ? { success: false, error: 'Conversion produced empty database' } : { success: true, convertedPath: outputPath, tables: tables.map(t => t.name), message: `Converted ${path.basename(filePath)} to SQLite` });
                });
              }
            });
          } else {
            resolve({ success: false, error: stderr || `Conversion failed with code ${code}` });
          }
        });
        setTimeout(() => { try { proc.kill(); } catch { } resolve({ success: false, error: 'Conversion timeout' }); }, 600000);
      });

      if (result.success) {
        analysis.conversion_triggered = true;
        analysis.converted_file = result.convertedPath;
        analysis.format_detected = 'SQL Server Backup (Auto-converted to SQLite)';
        analysis.details.conversion = { status: 'success', converted_path: result.convertedPath, message: result.message, tables: result.tables || [] };
      } else {
        analysis.format_detected = 'SQL Server Backup (Conversion Failed)';
        analysis.details.conversion = { status: 'error', error: result.error };
      }
      return analysis;
    }

    try {
      const sqlite3 = require('sqlite3').verbose();
      await new Promise((resolve, reject) => {
        const db = new sqlite3.Database(filePath, err => {
          if (err) reject(err);
          else db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
            if (err) reject(err);
            else {
              analysis.format_detected = 'SQLite Database';
              analysis.details.sqlite = { is_valid: true, tables: tables.map(t => t.name), table_count: tables.length };
              db.close(); resolve();
            }
          });
        });
      });
      return analysis;
    } catch { }

    try {
      const content = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' }).substring(0, 5000);
      const lines = content.split('\n').slice(0, 50);
      analysis.details.text = { is_readable: true, line_count: lines.length, first_line: lines[0]?.substring(0, 200) || '', sample_lines: lines.slice(0, 5).map(l => l.substring(0, 150)) };

      if (content.includes('CREATE TABLE') || content.includes('INSERT INTO')) {
        analysis.format_detected = 'SQL Dump File';
        analysis.details.text.format_type = 'SQL';
      } else if (lines[0] && (lines[0].includes(',') || lines[0].includes('\t') || lines[0].includes('|'))) {
        analysis.format_detected = 'CSV or Delimited Text';
        analysis.details.text.format_type = 'CSV';
      } else if (lines[0]?.trim().startsWith('{')) {
        analysis.format_detected = 'JSON';
        analysis.details.text.format_type = 'JSON';
      }
      return analysis;
    } catch {
      const header = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);
      const hex = header.toString('hex').substring(0, 8);
      if (hex.startsWith('53514c69')) analysis.format_detected = 'SQLite Database (corrupted or locked)';
      else if (hex.startsWith('425a6832')) analysis.format_detected = 'Bzip2 Compressed Archive';
      else if (hex.startsWith('1f8b0808')) analysis.format_detected = 'Gzip Compressed Archive';
      else if (hex.startsWith('504b0304')) analysis.format_detected = 'ZIP Archive';
      else analysis.format_detected = 'Unknown Binary Format';
      analysis.details.binary_analysis = { header_hex: hex };
      return analysis;
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = function registerFileHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  safeHandle('file:select', async (event, options) => {
    try { return await FileService.selectFile(options); }
    catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'select' }); }
  });

  safeHandle('file:importDb', async (event, dbPath) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can import databases' };
      if (!dbPath || typeof dbPath !== 'string') return { success: false, error: 'Database file path required' };
      return await DatabaseService.importExternalDatabase(dbPath);
    } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'importDb', entity: 'database' }); }
  });

  safeHandle('file:restoreBackup', async (event, filePath) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can restore backups' };
      if (!filePath || typeof filePath !== 'string') return { success: false, error: 'File path required' };
      return await DatabaseService.restoreBackup(filePath);
    } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'restoreBackup', entity: 'backup' }); }
  });

  safeHandle('file:runPythonScript', async (event, data) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can run scripts' };
      const { scriptPath, args = [] } = data || {};
      if (!scriptPath || typeof scriptPath !== 'string') return { success: false, error: 'Script path required' };

      const sanitizedPath = scriptPath.replace(/[;&|`$()]/g, '');
      if (!fs.existsSync(sanitizedPath)) return { success: false, error: 'Script file not found' };

      const sanitizedArgs = Array.isArray(args) ? args.map(a => String(a).replace(/[;&|`$()]/g, '')) : [];

      return new Promise(resolve => {
        const proc = spawn('python', [sanitizedPath, ...sanitizedArgs]);
        let stdout = '', stderr = '';
        proc.stdout.on('data', d => stdout += d.toString());
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
          if (code !== 0) resolve({ success: false, error: stderr || `Script exited with code ${code}` });
          else resolve({ success: true, output: stdout });
        });
        proc.on('error', error => resolve({ success: false, error: error.message }));
      });
    } catch (error) { return buildErrorResponse(error, { scope: 'file', action: 'runPythonScript', entity: 'script' }); }
  });

  safeHandle('file:validateSQLiteFile', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };
      return new Promise(resolve => {
        const sqlite3 = require('sqlite3').verbose();
        const db = new sqlite3.Database(filePath, err => {
          if (err) resolve({ success: false, error: 'Invalid SQLite database' });
          else db.all("SELECT name FROM sqlite_master LIMIT 1", (err, rows) => {
            db.close();
            resolve(err ? { success: false, error: 'Cannot read database' } : { success: true, valid: true });
          });
        });
      });
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('file:analyzeBakFile', async (event, filePath) => analyzeBakFile(filePath));

  safeHandle('database:importExternalWithSync', async (event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) return { success: false, error: 'File not found' };
      const analysis = await analyzeBakFile(filePath);
      if (!analysis.success) return analysis;

      let importPath = filePath;
      if (analysis.conversion_triggered && analysis.converted_file) importPath = analysis.converted_file;

      const importResult = await DatabaseService.importExternalDatabase(importPath);
      if (!importResult.success) return importResult;

      return {
        success: true, analysis, import: importResult,
        summary: { file_analyzed: analysis.file.name, file_size_mb: analysis.file.size_mb, was_converted: analysis.conversion_triggered ? 'YES' : 'NO', format_detected: analysis.format_detected, records_imported: importResult.imported || {}, message: 'Database imported successfully' }
      };
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('database:importExternalBatchWithSync', async (event, filePaths = []) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can import databases' };
      if (!Array.isArray(filePaths) || filePaths.length === 0) return { success: false, error: 'No files provided' };

      const uniqueFiles = Array.from(new Set(filePaths.map(p => String(p || '').trim()).filter(p => p.length > 0)));
      let totalBytes = 0;
      for (const p of uniqueFiles) { if (fs.existsSync(p)) totalBytes += fs.statSync(p).size; }

      const perFile = [];
      for (const filePath of uniqueFiles) {
        if (!fs.existsSync(filePath)) { perFile.push({ filePath, success: false, error: 'File not found' }); continue; }
        const analysis = await analyzeBakFile(filePath);
        if (!analysis?.success) { perFile.push({ filePath, success: false, error: analysis?.error || 'Analysis failed', analysis }); continue; }
        let importPath = analysis.conversion_triggered && analysis.converted_file ? analysis.converted_file : filePath;
        const importResult = await DatabaseService.importExternalDatabase(importPath);
        if (!importResult?.success) { perFile.push({ filePath, importPath, success: false, error: importResult?.error || 'Import failed', analysis, import: importResult }); continue; }
        perFile.push({ filePath, importPath, success: true, analysis, import: importResult });
      }

      const successCount = perFile.filter(r => r.success).length;
      return { success: successCount === perFile.length, summary: { total_files: perFile.length, success_files: successCount, failed_files: perFile.length - successCount, total_input_size_gb: Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2)) }, results: perFile };
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('henson:analyzeExport', async (event, filePath) => {
    try {
      const role = String(_currentUser?.role || '').toLowerCase();
      if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };
      return await HensonImportService.analyzeFile(filePath);
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('henson:importExport', async (event, payload = {}) => {
    try {
      const role = String(_currentUser?.role || '').toLowerCase();
      if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };
      const filePath = String(payload?.filePath || '').trim();
      if (!filePath) return { success: false, error: 'filePath is required' };

      const analysis = await HensonImportService.analyzeFile(filePath);
      if (!analysis.success) return analysis;

      const db = await DatabaseService.getDatabase();
      const imported = await HensonImportService.importFromFile(db, filePath, { userId: _currentUser?.id });

      if (imported.success && _currentUser?.id) {
        await DatabaseService.logActivity(_currentUser.id, 'import', 'tests', null, `Imported Henson 8000 export: ${path.basename(filePath)} (${imported.imported?.imported_tests || 0} tests)`);
      }

      return {
        success: imported.success, analysis, import: imported,
        summary: {
          file_name: analysis?.file?.name || path.basename(filePath),
          source_type: analysis?.source_type || imported?.source_type || 'unknown',
          imported_tests: imported?.imported?.imported_tests || 0,
          patients_created: imported?.imported?.patients_created || 0,
          skipped_duplicates: imported?.imported?.skipped_duplicates || 0,
          skipped_invalid: imported?.imported?.skipped_invalid || 0,
          warnings: imported?.imported?.warnings || []
        },
        error: imported.error
      };
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('henson:importFolder', async (event, payload = {}) => {
    try {
      const role = String(_currentUser?.role || '').toLowerCase();
      if (!['admin', 'doctor', 'assistant'].includes(role)) return { success: false, error: 'Access denied' };
      const folderPath = String(payload?.folderPath || '').trim();
      if (!folderPath || !fs.existsSync(folderPath)) return { success: false, error: 'Folder not found' };

      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      const files = entries.filter(e => e.isFile()).map(e => path.join(folderPath, e.name)).filter(p => ['.csv', '.txt', '.json', '.sqlite', '.db', '.pdf'].includes(path.extname(p).toLowerCase()));
      if (!files.length) return { success: false, error: 'No supported Henson export files found in folder' };

      const results = [];
      const aggregate = { imported_tests: 0, patients_created: 0, skipped_duplicates: 0, skipped_invalid: 0 };

      for (const filePath of files) {
        const analysis = await HensonImportService.analyzeFile(filePath);
        if (!analysis.success || !analysis.henson_compatible) { results.push({ filePath, success: false, error: !analysis.success ? analysis.error : 'Not Henson-compatible', analysis }); continue; }
        const db = await DatabaseService.getDatabase();
        const imported = await HensonImportService.importFromFile(db, filePath, { userId: _currentUser?.id });
        if (imported.success) {
          aggregate.imported_tests += Number(imported.imported?.imported_tests || 0);
          aggregate.patients_created += Number(imported.imported?.patients_created || 0);
          aggregate.skipped_duplicates += Number(imported.imported?.skipped_duplicates || 0);
          aggregate.skipped_invalid += Number(imported.imported?.skipped_invalid || 0);
        }
        results.push({ filePath, success: imported.success, analysis, import: imported, error: imported.error });
      }

      const successFiles = results.filter(r => r.success).length;
      if (_currentUser?.id) await DatabaseService.logActivity(_currentUser.id, 'import', 'tests', null, `Imported Henson 8000 folder: ${path.basename(folderPath)} (${aggregate.imported_tests} tests)`);
      return { success: successFiles > 0, summary: { folder: folderPath, total_files: files.length, success_files: successFiles, failed_files: files.length - successFiles, ...aggregate }, results };
    } catch (error) { return { success: false, error: error.message }; }
  });

  safeHandle('db:delete', async () => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can delete database' };
      return await DatabaseService.deleteDatabase();
    } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'deleteDatabase', entity: 'database' }); }
  });

  safeHandle('db:update', async (event, updates = {}) => {
    try {
      if (!_currentUser || String(_currentUser.role || '').toLowerCase() !== 'admin') return { success: false, error: 'Only admin can update database' };
      return await DatabaseService.updateDatabase(updates);
    } catch (error) { return buildErrorResponse(error, { scope: 'system', action: 'updateDatabase', entity: 'database' }); }
  });
};

