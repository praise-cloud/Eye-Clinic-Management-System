// electron/server/routes/case-notes.js
const { v4: uuidv4 } = require('uuid');
const { sqlQuery, sqlRun, sqlGet } = require('../database');
const { authenticated, authenticatedDoctorOrAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getCaseNoteRoutes() {
    return [
        {
            method: 'get',
            path: '/api/case-notes',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, doctor_id } = req.query;
                    let query = `SELECT cn.*, p.first_name || ' ' || p.last_name as patient_name,
                                 u.first_name || ' ' || u.last_name as doctor_name
                                 FROM case_notes cn 
                                 JOIN patients p ON cn.patient_id = p.id
                                 JOIN users u ON cn.doctor_id = u.id WHERE 1=1`;
                    const params = [];
                    if (patient_id) {
                        query += ' AND cn.patient_id = ?';
                        params.push(patient_id);
                    }
                    if (doctor_id) {
                        query += ' AND cn.doctor_id = ?';
                        params.push(doctor_id);
                    }
                    query += ' ORDER BY cn.created_at DESC LIMIT 50';
                    const caseNotes = sqlQuery(query, params);
                    res.json({ success: true, caseNotes });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/case-notes/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const caseNote = sqlGet(
                        `SELECT cn.*, p.first_name || ' ' || p.last_name as patient_name,
                         u.first_name || ' ' || u.last_name as doctor_name
                         FROM case_notes cn 
                         JOIN patients p ON cn.patient_id = p.id
                         JOIN users u ON cn.doctor_id = u.id WHERE cn.id = ?`,
                        [req.params.id]
                    );
                    if (!caseNote) return res.status(404).json({ success: false, error: 'Case note not found' });
                    const attachments = sqlQuery('SELECT * FROM case_note_attachments WHERE case_note_id = ?', [req.params.id]);
                    res.json({ success: true, caseNote, attachments });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/case-notes',
            handler: authenticatedDoctorOrAdmin(async (req, res) => {
                try {
                    const { patient_id, visit_id, test_id, chief_complaint, visual_acuity_od, visual_acuity_os,
                            intraocular_pressure_od, intraocular_pressure_os, cvf_analysis_od, cvf_analysis_os,
                            diagnosis, recommendation, next_appointment } = req.body;
                    
                    if (!patient_id) return res.status(400).json({ success: false, error: 'patient_id required' });
                    
                    const id = uuidv4();
                    sqlRun(
                        `INSERT INTO case_notes (id, patient_id, visit_id, test_id, doctor_id, chief_complaint, 
                         visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
                         cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment, 
                         status, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP)`,
                        [id, patient_id, visit_id || null, test_id || null, req.user?.userId, chief_complaint || '',
                         visual_acuity_od || '', visual_acuity_os || '', intraocular_pressure_od || '', intraocular_pressure_os || '',
                         cvf_analysis_od || '', cvf_analysis_os || '', diagnosis || '', recommendation || '', 
                         next_appointment || null]
                    );
                    
                    broadcast('data:update', { table: 'case_notes', action: 'create' });
                    const caseNote = sqlGet('SELECT * FROM case_notes WHERE id = ?', [id]);
                    res.json({ success: true, caseNote });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/case-notes/:id',
            handler: authenticatedDoctorOrAdmin(async (req, res) => {
                try {
                    const existing = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Case note not found' });
                    
                    const { chief_complaint, visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
                            cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment, status } = req.body;
                    
                    // If case note was previously signed and is now being edited, reset sign-off
                    let newStatus = status || existing.status;
                    let newSignedOffBy = existing.signed_off_by;
                    let newSignedOffAt = existing.signed_off_at;
                    
                    if (existing.signed_off_by && status !== 'signed') {
                        // Editing a signed note - reset to draft, require re-sign
                        newStatus = 'draft';
                        newSignedOffBy = null;
                        newSignedOffAt = null;
                    } else if (status === 'signed' && !existing.signed_off_by) {
                        // Signing for the first time
                        newSignedOffBy = req.user?.userId;
                        newSignedOffAt = new Date().toISOString();
                    }
                    
                    sqlRun(
                        `UPDATE case_notes SET 
                         chief_complaint = COALESCE(?, chief_complaint),
                         visual_acuity_od = COALESCE(?, visual_acuity_od),
                         visual_acuity_os = COALESCE(?, visual_acuity_os),
                         intraocular_pressure_od = COALESCE(?, intraocular_pressure_od),
                         intraocular_pressure_os = COALESCE(?, intraocular_pressure_os),
                         cvf_analysis_od = COALESCE(?, cvf_analysis_od),
                         cvf_analysis_os = COALESCE(?, cvf_analysis_os),
                         diagnosis = COALESCE(?, diagnosis),
                         recommendation = COALESCE(?, recommendation),
                         next_appointment = COALESCE(?, next_appointment),
                         status = ?,
                         signed_off_by = ?,
                         signed_off_at = ?,
                         updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [chief_complaint, visual_acuity_od, visual_acuity_os, intraocular_pressure_od, intraocular_pressure_os,
                         cvf_analysis_od, cvf_analysis_os, diagnosis, recommendation, next_appointment,
                         newStatus, newSignedOffBy, newSignedOffAt, req.params.id]
                    );
                    
                    broadcast('data:update', { table: 'case_notes', action: 'update' });
                    const caseNote = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
                    res.json({ success: true, caseNote, signOffReset: existing.signed_off_by && !newSignedOffBy });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/case-notes/:id/sign',
            handler: authenticatedDoctorOrAdmin(async (req, res) => {
                try {
                    const existing = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Case note not found' });
                    
                    sqlRun(
                        `UPDATE case_notes SET status = 'signed', signed_off_by = ?, signed_off_at = ?,
                         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [req.user?.userId, new Date().toISOString(), req.params.id]
                    );
                    
                    broadcast('data:update', { table: 'case_notes', action: 'update' });
                    const caseNote = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
                    res.json({ success: true, caseNote });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'delete',
            path: '/api/case-notes/:id',
            handler: authenticatedDoctorOrAdmin(async (req, res) => {
                try {
                    const existing = sqlGet('SELECT * FROM case_notes WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Case note not found' });
                    
                    sqlRun('DELETE FROM case_note_attachments WHERE case_note_id = ?', [req.params.id]);
                    sqlRun('DELETE FROM case_notes WHERE id = ?', [req.params.id]);
                    broadcast('data:update', { table: 'case_notes', action: 'delete' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getCaseNoteRoutes };
