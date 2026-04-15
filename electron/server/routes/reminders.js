// electron/server/routes/reminders.js
const { v4: uuidv4 } = require('uuid');
const { sqlQuery, sqlRun, sqlGet } = require('../database');
const { authenticated } = require('../auth');
const { broadcast } = require('../websocket');

function getReminderRoutes() {
    return [
        {
            method: 'get',
            path: '/api/reminders',
            handler: authenticated(async (req, res) => {
                try {
                    const { status, patient_id } = req.query;
                    let query = `SELECT ar.*, p.first_name || ' ' || p.last_name as patient_name,
                                 u.first_name || ' ' || u.last_name as assistant_name
                                 FROM appointment_reminders ar 
                                 JOIN patients p ON ar.patient_id = p.id
                                 JOIN users u ON ar.notified_to = u.id WHERE 1=1`;
                    const params = [];
                    if (status) {
                        query += ' AND ar.status = ?';
                        params.push(status);
                    }
                    if (patient_id) {
                        query += ' AND ar.patient_id = ?';
                        params.push(patient_id);
                    }
                    query += ' ORDER BY ar.appointment_date DESC LIMIT 50';
                    const reminders = sqlQuery(query, params);
                    res.json({ success: true, reminders });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/reminders/upcoming',
            handler: authenticated(async (req, res) => {
                try {
                    const today = new Date().toISOString().slice(0, 10);
                    const reminders = sqlQuery(
                        `SELECT ar.*, p.first_name || ' ' || p.last_name as patient_name,
                                p.contact as patient_contact,
                                cn.diagnosis as last_diagnosis
                         FROM appointment_reminders ar
                         JOIN patients p ON ar.patient_id = p.id
                         LEFT JOIN case_notes cn ON cn.patient_id = ar.patient_id
                         WHERE ar.appointment_date >= ? AND ar.status = 'pending'
                         ORDER BY ar.appointment_date LIMIT 20`,
                        [today]
                    );
                    res.json({ success: true, reminders });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/reminders/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const reminder = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [req.params.id]);
                    if (!reminder) return res.status(404).json({ success: false, error: 'Reminder not found' });
                    res.json({ success: true, reminder });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/reminders',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, case_note_id, visit_id, appointment_date, reminder_for, notified_to, notes } = req.body;
                    
                    if (!patient_id || !appointment_date || !notified_to) {
                        return res.status(400).json({ success: false, error: 'patient_id, appointment_date, and notified_to required' });
                    }
                    
                    const id = uuidv4();
                    sqlRun(
                        `INSERT INTO appointment_reminders (id, patient_id, case_note_id, visit_id, appointment_date, 
                         reminder_for, status, notified_to, notes, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP)`,
                        [id, patient_id, case_note_id || null, visit_id || null, appointment_date, reminder_for || '', notified_to, notes || '']
                    );
                    
                    broadcast('data:update', { table: 'appointment_reminders', action: 'create' });
                    const reminder = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [id]);
                    res.json({ success: true, reminder });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/reminders/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const existing = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Reminder not found' });
                    
                    const { status, notes } = req.body;
                    sqlRun(
                        `UPDATE appointment_reminders SET status = COALESCE(?, status), notes = COALESCE(?, notes),
                         notified_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE notified_at END,
                         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [status, notes, status, req.params.id]
                    );
                    
                    broadcast('data:update', { table: 'appointment_reminders', action: 'update' });
                    const reminder = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [req.params.id]);
                    res.json({ success: true, reminder });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'delete',
            path: '/api/reminders/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const existing = sqlGet('SELECT * FROM appointment_reminders WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Reminder not found' });
                    
                    sqlRun('DELETE FROM appointment_reminders WHERE id = ?', [req.params.id]);
                    broadcast('data:update', { table: 'appointment_reminders', action: 'delete' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getReminderRoutes };
