const HensonImportService = require('../src/services/HensonImportService');

describe('HensonImportService', () => {
  it('analyzes Henson-like CSV as compatible', async () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const tempFile = path.join(os.tmpdir(), `henson_test_${Date.now()}.csv`);
    fs.writeFileSync(
      tempFile,
      'patient_id,eye,test_date,md,psd,vfi\nPAT001,OD,2026-02-20,-3.1,2.2,94\n',
      'utf8'
    );

    const analysis = await HensonImportService.analyzeFile(tempFile);
    expect(analysis.success).toBe(true);
    expect(analysis.henson_compatible).toBe(true);
    expect(analysis.estimate_records).toBeGreaterThan(0);

    fs.unlinkSync(tempFile);
  });

  it('imports records with duplicate protection', async () => {
    const patientsById = new Map();
    const patientsByName = new Map();
    const tests = [];

    const db = {
      run: jest.fn(async (query, params = []) => {
        if (query.includes('INSERT INTO patients')) {
          const newId = params[0];
          const patientCode = params[1];
          const firstName = params[2];
          const lastName = params[3];
          patientsById.set(patientCode, { id: newId });
          patientsByName.set(`${firstName}|${lastName}`, { id: newId });
          return { changes: 1 };
        }
        if (query.includes('INSERT INTO tests')) {
          tests.push({
            id: params[0],
            patient_id: params[1],
            eye: params[3],
            test_date: params[4],
            raw_data: params[5]
          });
          return { changes: 1 };
        }
        return { changes: 1 };
      }),
      get: jest.fn(async (query, params = []) => {
        if (query.includes('FROM patients WHERE patient_id = ?')) {
          return patientsById.get(params[0]) || null;
        }
        if (query.includes('FROM patients WHERE first_name = ? AND last_name = ?')) {
          return patientsByName.get(`${params[0]}|${params[1]}`) || null;
        }
        if (query.includes('FROM tests')) {
          const patientId = params[0];
          const sig = String(params[1] || '').replace(/%/g, '');
          const found = tests.find(
            (t) => t.patient_id === patientId && t.raw_data.includes(sig)
          );
          return found ? { id: found.id } : null;
        }
        return null;
      })
    };

    const input = [
      {
        isCandidate: true,
        patient_id: 'PAT001',
        patient_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        eye: 'right',
        test_date: '2026-02-20T10:00:00.000Z',
        external_test_id: 'EXAM-1',
        md: '-3.0',
        psd: '2.0',
        vfi: '95',
        raw_source: { patient_id: 'PAT001' }
      },
      {
        isCandidate: true,
        patient_id: 'PAT001',
        patient_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        eye: 'right',
        test_date: '2026-02-20T10:00:00.000Z',
        external_test_id: 'EXAM-1',
        md: '-3.0',
        psd: '2.0',
        vfi: '95',
        raw_source: { patient_id: 'PAT001' }
      }
    ];

    const result = await HensonImportService.importRecords(db, input, { userId: 'admin-1' });
    expect(result.success).toBe(true);
    expect(result.stats.imported_tests).toBe(1);
    expect(result.stats.skipped_duplicates).toBe(1);
    expect(result.stats.patients_created).toBe(1);
  });
});
