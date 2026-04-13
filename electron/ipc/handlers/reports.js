const { ipcMain, BrowserWindow } = require('electron');
const DatabaseService = require('../../../src/services/DatabaseService');
const FileService = require('../../../src/services/FileService');
const { buildErrorResponse } = require('./utils');

let _currentUser = null;
function setCurrentUser(u) { _currentUser = u; }

module.exports = function registerReportsHandlers(ctx) {
  _currentUser = ctx.currentUser;
  if (ctx._setCurrentUser) {
    const orig = ctx._setCurrentUser;
    ctx._setCurrentUser = (u) => { _currentUser = u; orig(u); };
  } else {
    ctx._setCurrentUser = (u) => { _currentUser = u; };
  }

  ipcMain.handle('reports:getAll', async (event, filters = {}) => {
    try {
      const reports = await DatabaseService.getAllReports(filters);
      return { success: true, reports };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'reports', action: 'getAll', entity: 'report' });
    }
  });

  ipcMain.handle('reports:getById', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Report ID required' };
      const report = await DatabaseService.getReportById(id);
      return report ? { success: true, report } : { success: false, error: 'Report not found' };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'reports', action: 'getById', entity: 'report' });
    }
  });

  ipcMain.handle('reports:generate', async (event, { patientId, testIds, title, reportType }) => {
    try {
      if (!patientId) return { success: false, error: 'Patient ID required' };
      const patient = await DatabaseService.getPatientById(patientId);
      if (!patient) return { success: false, error: 'Patient not found' };

      let testsData = [];
      if (testIds?.length) {
        for (const tid of testIds) {
          const t = await DatabaseService.getTestById(tid);
          if (t) testsData.push(t);
        }
      } else {
        testsData = await DatabaseService.getAllTests({ patientId });
      }

      const pdfResult = await FileService.generatePatientReport(patient, testsData);
      if (!pdfResult.success) return { success: false, error: pdfResult.error };

      const reportData = {
        patient_id: patientId,
        report_file: pdfResult.pdfData,
        report_type: reportType || 'visual_field_report',
        title: title || `Report for ${patient.first_name} ${patient.last_name}`
      };

      const report = await DatabaseService.createReport(reportData);
      return { success: true, report, fileName: pdfResult.fileName };
    } catch (error) {
      return buildErrorResponse(error, { scope: 'reports', action: 'generate', entity: 'report' });
    }
  });

  ipcMain.handle('reports:export', async (event, { reportId, format }) => {
    try {
      if (!reportId) return { success: false, error: 'Report ID required' };
      const report = await DatabaseService.getReportById(reportId);
      if (!report) return { success: false, error: 'Report not found' };

      const saveResult = await FileService.saveFile({
        title: 'Export Report',
        defaultPath: `${report.patient_identifier || 'report'}_report.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        data: report.report_file
      });
      return saveResult;
    } catch (error) {
      return buildErrorResponse(error, { scope: 'reports', action: 'export', entity: 'report' });
    }
  });

  ipcMain.handle('reports:delete', async (event, id) => {
    try {
      if (!id) return { success: false, error: 'Report ID required' };
      return await DatabaseService.deleteReport(id);
    } catch (error) {
      return buildErrorResponse(error, { scope: 'reports', action: 'delete', entity: 'report' });
    }
  });
};
