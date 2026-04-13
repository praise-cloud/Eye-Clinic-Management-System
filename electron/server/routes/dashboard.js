const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated } = require('../auth');

function getDashboardRoutes() {
    return [
        {
            method: 'get',
            path: '/api/dashboard/stats',
            handler: authenticated(async (req, res) => {
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const [pc, tc, rt, rm, pp, nct] = await Promise.all([
                        sqlQuery('SELECT COUNT(*) as cnt FROM patients'),
                        sqlQuery('SELECT COUNT(*) as cnt FROM tests'),
                        sqlQuery(
                            'SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE CAST(timestamp AS DATE)=@today',
                            [{ name: 'today', type: mssql.VarChar, value: today }]
                        ),
                        sqlQuery('SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE MONTH(timestamp)=MONTH(GETDATE()) AND YEAR(timestamp)=YEAR(GETDATE())'),
                        sqlQuery("SELECT COUNT(*) as cnt FROM prescriptions WHERE status='pending'"),
                        sqlQuery(
                            'SELECT COUNT(*) as cnt FROM patients WHERE CAST(created_at AS DATE)=@today',
                            [{ name: 'today', type: mssql.VarChar, value: today }]
                        )
                    ]);
                    res.json({
                        success: true,
                        stats: {
                            totalPatients: pc.recordset[0].cnt,
                            totalTests: tc.recordset[0].cnt,
                            todayRevenue: rt.recordset[0].total,
                            monthlyRevenue: rm.recordset[0].total,
                            pendingPrescriptions: pp.recordset[0].cnt,
                            newClientsToday: nct.recordset[0].cnt
                        }
                    });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getDashboardRoutes };
