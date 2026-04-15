// electron/server/routes/visits.js
const { v4: uuidv4 } = require('uuid');
const { sqlQuery, sqlRun, sqlGet } = require('../database');
const { authenticated, authenticatedDoctorOrAdmin } = require('../auth');
const { broadcast } = require('../websocket');

function getVisitRoutes() {
    return [
        {
            method: 'get',
            path: '/api/visits',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, page = 1 } = req.query;
                    let query = `SELECT v.*, p.first_name || ' ' || p.last_name as patient_name 
                                 FROM visits v 
                                 JOIN patients p ON v.patient_id = p.id`;
                    const params = [];
                    if (patient_id) {
                        query += ' WHERE v.patient_id = ?';
                        params.push(patient_id);
                    }
                    query += ' ORDER BY v.visit_date DESC LIMIT 50';
                    const visits = sqlQuery(query, params);
                    res.json({ success: true, visits });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/visits/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const visit = sqlGet('SELECT v.*, p.first_name || " " || p.last_name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = ?', [req.params.id]);
                    if (!visit) return res.status(404).json({ success: false, error: 'Visit not found' });
                    res.json({ success: true, visit });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'post',
            path: '/api/visits',
            handler: authenticated(async (req, res) => {
                try {
                    const { patient_id, visit_date, visit_type, reason, payment_status, amount_paid, linked_prescription_id } = req.body;
                    if (!patient_id || !visit_date) return res.status(400).json({ success: false, error: 'patient_id and visit_date required' });
                    
                    const id = uuidv4();
                    sqlRun(
                        `INSERT INTO visits (id, patient_id, visit_date, visit_type, reason, payment_status, amount_paid, linked_prescription_id, created_by, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [id, patient_id, visit_date, visit_type || 'follow_up', reason || '', payment_status || 'pending', amount_paid || 0, linked_prescription_id || null, req.user?.userId || null]
                    );
                    
                    broadcast('data:update', { table: 'visits', action: 'create' });
                    const visit = sqlGet('SELECT * FROM visits WHERE id = ?', [id]);
                    res.json({ success: true, visit });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'put',
            path: '/api/visits/:id',
            handler: authenticated(async (req, res) => {
                try {
                    const { visit_type, reason, payment_status, amount_paid } = req.body;
                    const existing = sqlGet('SELECT * FROM visits WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Visit not found' });
                    
                    sqlRun(
                        `UPDATE visits SET visit_type = COALESCE(?, visit_type), reason = COALESCE(?, reason), 
                         payment_status = COALESCE(?, payment_status), amount_paid = COALESCE(?, amount_paid),
                         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                        [visit_type, reason, payment_status, amount_paid, req.params.id]
                    );
                    
                    broadcast('data:update', { table: 'visits', action: 'update' });
                    const visit = sqlGet('SELECT * FROM visits WHERE id = ?', [req.params.id]);
                    res.json({ success: true, visit });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'delete',
            path: '/api/visits/:id',
            handler: authenticatedDoctorOrAdmin(async (req, res) => {
                try {
                    const existing = sqlGet('SELECT * FROM visits WHERE id = ?', [req.params.id]);
                    if (!existing) return res.status(404).json({ success: false, error: 'Visit not found' });
                    
                    sqlRun('DELETE FROM visits WHERE id = ?', [req.params.id]);
                    broadcast('data:update', { table: 'visits', action: 'delete' });
                    res.json({ success: true });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getVisitRoutes };
