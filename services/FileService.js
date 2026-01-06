const { dialog, shell } = require('electron');
const fs = require('fs-extra');
const path = require('path');

class FileService {
    // Select file dialog
    async selectFile(options = {}) {
        try {
            const result = await dialog.showOpenDialog({
                title: options.title || 'Select File',
                defaultPath: options.defaultPath,
                filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
                properties: ['openFile']
            });

            if (result.canceled) {
                return { success: false, canceled: true };
            }

            const filePath = result.filePaths[0];
            return { success: true, filePath };
        } catch (error) {
            console.error('File select error:', error);
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
            console.error('File save error:', error);
            return { error: error.message };
        }
    }

    // Read file
    async readFile(filePath, encoding = 'utf8') {
        try {
            const data = await fs.readFile(filePath, encoding);
            return { success: true, data };
        } catch (error) {
            console.error('File read error:', error);
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
            console.error('CSV parse error:', error);
            return { error: error.message };
        }
    }

    // Open file with default application
    async openFile(filePath) {
        try {
            await shell.openPath(filePath);
            return { success: true };
        } catch (error) {
            console.error('File open error:', error);
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
            console.error('Report generation error:', error);
            return { error: error.message };
        }
    }
}

module.exports = new FileService();
