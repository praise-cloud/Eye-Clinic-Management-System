const { dialog, shell } = require('electron');
const fs = require('fs-extra');
const path = require('path');

// Simple logger wrapper for CommonJS context
const logger = {
    debug: (msg, data) => console.debug(`[${new Date().toISOString()}] [DEBUG] ${msg}`, data ?? ''),
    info: (msg, data) => console.info(`[${new Date().toISOString()}] [INFO] ${msg}`, data ?? ''),
    warn: (msg, data) => console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, data ?? ''),
    error: (msg, data) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, data ?? ''),
};

class FileService {
    // Select file dialog
    async selectFile(options = {}) {
        try {
            const properties = Array.isArray(options.properties) && options.properties.length
                ? options.properties
                : ['openFile'];
            const result = await dialog.showOpenDialog({
                title: options.title || 'Select File',
                defaultPath: options.defaultPath,
                filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
                properties
            });

            if (result.canceled) {
                return { success: false, canceled: true };
            }

            const filePath = result.filePaths[0];
            return { success: true, filePath, filePaths: result.filePaths || [] };
        } catch (error) {
            logger.error('FileService: File select error', { error: error.message });
            return { error: error.message };
        }
    }

    // Save file dialog
    async saveFile(options = {}) {
        try {
            const result = await dialog.showSaveDialog({
                title: options.title || 'Save File',
                defaultPath: options.defaultPath,
                filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
            });

            if (result.canceled) {
                return { success: false, canceled: true };
            }

            const filePath = result.filePath;

            // Write data if provided
            if (options.data) {
                await fs.writeFile(filePath, options.data);
            }

            return { success: true, filePath };
        } catch (error) {
            logger.error('FileService: File save error', { error: error.message });
            return { error: error.message };
        }
    }

    // Read file
    async readFile(filePath, encoding = 'utf8') {
        try {
            const data = await fs.readFile(filePath, encoding);
            return { success: true, data };
        } catch (error) {
            logger.error('FileService: File read error', { error: error.message });
            return { error: error.message };
        }
    }

    // Parse CSV test data
    async parseCSVTestData(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());

            if (lines.length === 0) {
                return { error: 'Empty file' };
            }

            // Simple CSV parsing (you may want to use a library like csv-parse)
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                return row;
            });

            return { success: true, data: rows, headers };
        } catch (error) {
            logger.error('FileService: CSV parse error', { error: error.message });
            return { error: error.message };
        }
    }

    // Open file with default application
    async openFile(filePath) {
        try {
            await shell.openPath(filePath);
            return { success: true };
        } catch (error) {
            logger.error('FileService: File open error', { error: error.message });
            return { error: error.message };
        }
    }

    // Generate patient report (placeholder - implement with jsPDF or similar)
    async generatePatientReport(patient, tests) {
        try {
            // This is a placeholder. Implement actual PDF generation using jsPDF or pdf-lib
            const reportData = {
                patient,
                tests,
                generatedAt: new Date().toISOString()
            };

            const fileName = `${patient.patient_id}_report_${Date.now()}.pdf`;
            const pdfData = JSON.stringify(reportData); // Replace with actual PDF generation

            return {
                success: true,
                pdfData,
                fileName
            };
        } catch (error) {
            logger.error('FileService: Report generation error', { error: error.message });
            return { error: error.message };
        }
    }
}

module.exports = new FileService();
