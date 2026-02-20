const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const createId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
};

class HensonImportService {
    detectFileType(filePath) {
        const ext = path.extname(String(filePath || '')).toLowerCase();
        if (ext === '.csv' || ext === '.txt') return 'csv';
        if (ext === '.json') return 'json';
        if (ext === '.sqlite' || ext === '.db') return 'sqlite';
        if (ext === '.pdf') return 'pdf';
        return 'unknown';
    }

    async analyzeFile(filePath) {
        if (!filePath || !fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' };
        }

        const stat = fs.statSync(filePath);
        const fileType = this.detectFileType(filePath);
        const base = {
            success: true,
            file: {
                path: filePath,
                name: path.basename(filePath),
                size_bytes: stat.size,
                size_mb: Number((stat.size / (1024 * 1024)).toFixed(2))
            },
            source_type: fileType,
            henson_compatible: false,
            estimate_records: 0,
            warnings: []
        };

        try {
            if (fileType === 'csv') {
                const text = fs.readFileSync(filePath, 'utf8');
                const parsed = this.parseCsv(text);
                const normalized = parsed.rows.map((row) => this.normalizeRecord(row)).filter((r) => r.isCandidate);
                base.henson_compatible = normalized.length > 0;
                base.estimate_records = normalized.length;
                if (!normalized.length) {
                    base.warnings.push('No Henson-like records detected in CSV headers/rows.');
                }
                return base;
            }

            if (fileType === 'json') {
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsedJson = JSON.parse(raw);
                const rows = Array.isArray(parsedJson)
                    ? parsedJson
                    : (Array.isArray(parsedJson?.records) ? parsedJson.records : []);
                const normalized = rows.map((row) => this.normalizeRecord(row)).filter((r) => r.isCandidate);
                base.henson_compatible = normalized.length > 0;
                base.estimate_records = normalized.length;
                if (!normalized.length) {
                    base.warnings.push('JSON file does not include recognizable Henson test record structure.');
                }
                return base;
            }

            if (fileType === 'sqlite') {
                const tableScan = await this.scanSqliteForCandidates(filePath, { previewOnly: true, limit: 2000 });
                base.henson_compatible = tableScan.candidates.length > 0;
                base.estimate_records = tableScan.candidates.length;
                if (!tableScan.candidates.length) {
                    base.warnings.push('SQLite file has no table rows matching Henson test patterns.');
                }
                if (tableScan.warnings.length) {
                    base.warnings.push(...tableScan.warnings);
                }
                return base;
            }

            if (fileType === 'pdf') {
                base.henson_compatible = true;
                base.estimate_records = 1;
                base.warnings.push('PDF-only import creates an attachment report, not structured test metrics.');
                return base;
            }

            return {
                ...base,
                success: false,
                henson_compatible: false,
                error: 'Unsupported file type for Henson import. Use CSV, JSON, SQLite, DB, or PDF export.'
            };
        } catch (error) {
            return { ...base, success: false, error: error.message };
        }
    }

    parseCsv(text) {
        const lines = String(text || '')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        if (!lines.length) return { headers: [], rows: [] };

        const delimiterCandidates = [',', '\t', ';', '|'];
        const headerLine = lines[0];
        let delimiter = ',';
        let bestScore = -1;

        for (const d of delimiterCandidates) {
            const score = headerLine.split(d).length;
            if (score > bestScore) {
                bestScore = score;
                delimiter = d;
            }
        }

        const headers = headerLine
            .split(delimiter)
            .map((h) => this.normalizeKey(h));

        const rows = lines.slice(1).map((line) => {
            const values = line.split(delimiter);
            const row = {};
            headers.forEach((h, index) => {
                row[h] = (values[index] || '').trim();
            });
            return row;
        });

        return { headers, rows };
    }

    normalizeKey(input) {
        return String(input || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    pickValue(row, keys = []) {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                return String(row[key]).trim();
            }
        }
        return '';
    }

    normalizeEye(rawEye) {
        const val = String(rawEye || '').trim().toLowerCase();
        if (!val) return 'both';
        if (['left', 'l', 'os'].includes(val)) return 'left';
        if (['right', 'r', 'od'].includes(val)) return 'right';
        if (['both', 'ou', 'binocular'].includes(val)) return 'both';
        return 'both';
    }

    normalizeDate(rawDate) {
        const source = String(rawDate || '').trim();
        if (!source) return { value: new Date().toISOString(), warning: 'Missing test_date; current timestamp used.' };
        const parsed = new Date(source);
        if (Number.isNaN(parsed.getTime())) {
            return { value: new Date().toISOString(), warning: `Invalid test_date "${source}"; current timestamp used.` };
        }
        return { value: parsed.toISOString(), warning: null };
    }

    normalizeRecord(row) {
        const normalized = {};
        Object.keys(row || {}).forEach((k) => {
            normalized[this.normalizeKey(k)] = row[k];
        });

        const patientId = this.pickValue(normalized, [
            'patient_id', 'patientid', 'hospital_no', 'hospital_number', 'record_no', 'record_number'
        ]);
        const patientName = this.pickValue(normalized, ['patient_name', 'patient', 'name', 'full_name']);
        const firstName = this.pickValue(normalized, ['first_name', 'firstname', 'given_name']);
        const lastName = this.pickValue(normalized, ['last_name', 'lastname', 'surname', 'family_name']);
        const eye = this.normalizeEye(this.pickValue(normalized, ['eye', 'test_eye', 'laterality', 'od_os']));
        const dateResult = this.normalizeDate(this.pickValue(normalized, ['test_date', 'exam_date', 'date', 'datetime', 'test_datetime']));
        const externalTestId = this.pickValue(normalized, ['test_id', 'exam_id', 'session_id', 'result_id']);

        const md = this.pickValue(normalized, ['md', 'mean_deviation']);
        const psd = this.pickValue(normalized, ['psd', 'pattern_standard_deviation']);
        const vfi = this.pickValue(normalized, ['vfi', 'visual_field_index']);

        const candidateSignals = [patientId, patientName, firstName, lastName, md, psd, vfi];
        const isCandidate = candidateSignals.filter((v) => String(v || '').length > 0).length >= 2;

        const patientLabel = patientName || `${firstName} ${lastName}`.trim();

        return {
            isCandidate,
            patient_id: patientId,
            patient_name: patientLabel,
            first_name: firstName,
            last_name: lastName,
            eye,
            test_date: dateResult.value,
            date_warning: dateResult.warning,
            doctor_name: this.pickValue(normalized, ['doctor_name', 'doctor', 'consultant', 'physician']),
            external_test_id: externalTestId,
            md,
            psd,
            vfi,
            fixation_losses: this.pickValue(normalized, ['fixation_losses', 'fixation_loss']),
            false_positives: this.pickValue(normalized, ['false_positives', 'fp']),
            false_negatives: this.pickValue(normalized, ['false_negatives', 'fn']),
            strategy: this.pickValue(normalized, ['strategy', 'test_strategy']),
            pattern: this.pickValue(normalized, ['pattern', 'test_pattern']),
            diagnosis: this.pickValue(normalized, ['diagnosis', 'impression']),
            notes: this.pickValue(normalized, ['notes', 'comment', 'remarks']),
            raw_source: normalized
        };
    }

    buildSignature(record, patientId) {
        const basis = [
            record.external_test_id || '',
            patientId || '',
            (record.test_date || '').slice(0, 19),
            record.eye || 'both',
            record.md || '',
            record.psd || '',
            record.vfi || ''
        ].join('|');
        return Buffer.from(basis).toString('base64');
    }

    async findOrCreatePatient(db, record, stats) {
        if (record.patient_id) {
            const foundByPid = await db.get('SELECT id FROM patients WHERE patient_id = ?', [record.patient_id]);
            if (foundByPid?.id) return foundByPid.id;
        }

        const firstName = record.first_name || String(record.patient_name || '').split(/\s+/)[0] || 'Unknown';
        const lastName = record.last_name || String(record.patient_name || '').split(/\s+/).slice(1).join(' ') || 'Patient';
        const byName = await db.get(
            'SELECT id FROM patients WHERE first_name = ? AND last_name = ? ORDER BY created_at DESC',
            [firstName, lastName]
        );
        if (byName?.id) return byName.id;

        const patientCode = record.patient_id || `HENSON-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newPatientId = createId();
        await db.run(
            `INSERT INTO patients (id, patient_id, first_name, last_name, dob, gender, contact, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [newPatientId, patientCode, firstName, lastName, null, 'other', null]
        );
        stats.patients_created += 1;
        return newPatientId;
    }

    async importRecords(db, normalizedRecords, options = {}) {
        const stats = {
            total_candidates: normalizedRecords.length,
            imported_tests: 0,
            skipped_duplicates: 0,
            skipped_invalid: 0,
            patients_created: 0,
            warnings: []
        };

        await db.run('BEGIN');
        try {
            for (const record of normalizedRecords) {
                if (!record.isCandidate) {
                    stats.skipped_invalid += 1;
                    continue;
                }
                if (!record.patient_id && !record.patient_name) {
                    stats.skipped_invalid += 1;
                    stats.warnings.push('Skipped one record with no patient identifier.');
                    continue;
                }
                if (record.date_warning) {
                    stats.warnings.push(record.date_warning);
                }

                const patientDbId = await this.findOrCreatePatient(db, record, stats);
                const signature = this.buildSignature(record, patientDbId);
                const dup = await db.get(
                    `SELECT id FROM tests
                     WHERE patient_id = ? AND machine_type = 'henson_8000'
                     AND raw_data LIKE ? LIMIT 1`,
                    [patientDbId, `%${signature}%`]
                );
                if (dup?.id) {
                    stats.skipped_duplicates += 1;
                    continue;
                }

                const testId = createId();
                const payload = {
                    source: 'henson_8000',
                    imported_at: new Date().toISOString(),
                    imported_by: options.userId || null,
                    doctor_name: record.doctor_name || null,
                    diagnosis: record.diagnosis || null,
                    notes: record.notes || null,
                    strategy: record.strategy || null,
                    pattern: record.pattern || null,
                    md: record.md || null,
                    psd: record.psd || null,
                    vfi: record.vfi || null,
                    fixation_losses: record.fixation_losses || null,
                    false_positives: record.false_positives || null,
                    false_negatives: record.false_negatives || null,
                    external_test_id: record.external_test_id || null,
                    henson_signature: signature,
                    raw_source: record.raw_source
                };

                await db.run(
                    `INSERT INTO tests (id, patient_id, machine_type, eye, test_date, raw_data, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [testId, patientDbId, 'henson_8000', record.eye || 'both', record.test_date, JSON.stringify(payload)]
                );
                stats.imported_tests += 1;
            }
            await db.run('COMMIT');
            return { success: true, stats };
        } catch (error) {
            try { await db.run('ROLLBACK'); } catch {}
            return { success: false, error: error.message, stats };
        }
    }

    async scanSqliteForCandidates(sqlitePath, { previewOnly = false, limit = 5000 } = {}) {
        const warnings = [];
        const candidates = [];

        const db = await new Promise((resolve, reject) => {
            const sqlite = new sqlite3.Database(sqlitePath, (err) => {
                if (err) reject(err);
                else resolve(sqlite);
            });
        });

        const all = (sql, params = []) => new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        try {
            const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
            const names = tables
                .map((t) => String(t.name || ''))
                .filter((n) => n && !n.startsWith('sqlite_'));

            for (const tableName of names) {
                let rows = [];
                try {
                    rows = await all(`SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT ?`, [limit]);
                } catch (tableErr) {
                    warnings.push(`Failed reading table ${tableName}: ${tableErr.message}`);
                    continue;
                }
                for (const row of rows) {
                    const normalized = this.normalizeRecord(row);
                    if (normalized.isCandidate) {
                        candidates.push(normalized);
                    }
                }
                if (previewOnly && candidates.length >= limit) break;
            }
            return { candidates, warnings };
        } finally {
            try { db.close(); } catch {}
        }
    }

    async importFromFile(db, filePath, options = {}) {
        const fileType = this.detectFileType(filePath);
        if (fileType === 'unknown') {
            return { success: false, error: 'Unsupported file type for Henson import.' };
        }

        if (fileType === 'pdf') {
            return this.importPdfAttachment(db, filePath, options);
        }

        let normalizedRecords = [];
        if (fileType === 'csv') {
            const text = fs.readFileSync(filePath, 'utf8');
            const parsed = this.parseCsv(text);
            normalizedRecords = parsed.rows.map((row) => this.normalizeRecord(row));
        } else if (fileType === 'json') {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsedJson = JSON.parse(raw);
            const rows = Array.isArray(parsedJson)
                ? parsedJson
                : (Array.isArray(parsedJson?.records) ? parsedJson.records : []);
            normalizedRecords = rows.map((row) => this.normalizeRecord(row));
        } else if (fileType === 'sqlite') {
            const scanned = await this.scanSqliteForCandidates(filePath, { previewOnly: false, limit: 100000 });
            normalizedRecords = scanned.candidates;
        }

        const candidates = normalizedRecords.filter((r) => r.isCandidate);
        if (!candidates.length) {
            return { success: false, error: 'No valid Henson-like test records found in file.' };
        }

        const imported = await this.importRecords(db, candidates, options);
        return {
            success: imported.success,
            error: imported.error,
            source_type: fileType,
            imported: imported.stats
        };
    }

    async importPdfAttachment(db, filePath, options = {}) {
        // PDF-only mode: attach a report for an existing patient by patient_id in filename (if available)
        const baseName = path.basename(filePath, path.extname(filePath));
        const maybePid = baseName.split(/[\s_-]+/)[0];
        const patient = await db.get('SELECT id FROM patients WHERE patient_id = ?', [maybePid]);
        if (!patient?.id) {
            return {
                success: false,
                error: 'PDF import requires filename prefix with existing patient_id (e.g. PAT123_report.pdf).'
            };
        }

        const buffer = fs.readFileSync(filePath);
        const b64 = buffer.toString('base64');
        const reportId = createId();
        const reportPayload = JSON.stringify({
            source: 'henson_8000',
            file_name: path.basename(filePath),
            mime_type: 'application/pdf',
            data_base64: b64,
            imported_by: options.userId || null,
            imported_at: new Date().toISOString()
        });

        await db.run(
            `INSERT INTO reports (id, patient_id, report_type, title, report_file, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [reportId, patient.id, 'visual_field_report', `Henson 8000 Report - ${path.basename(filePath)}`, reportPayload]
        );

        return {
            success: true,
            source_type: 'pdf',
            imported: {
                total_candidates: 1,
                imported_tests: 0,
                skipped_duplicates: 0,
                skipped_invalid: 0,
                patients_created: 0,
                warnings: ['PDF imported as report attachment only.']
            }
        };
    }
}

module.exports = new HensonImportService();
