const mssql = require('mssql');
const { sqlQuery } = require('../database');
const { authenticated, authenticatedAdmin } = require('../auth');

function getRevenueRoutes() {
    return [
        {
            method: 'get',
            path: '/api/revenue',
            handler: authenticated(async (req, res) => {
                try {
                    const { startDate, endDate, source } = req.query;
                    let query = `SELECT r.*, pt.first_name+' '+pt.last_name as patient_name, u.first_name+' '+u.last_name as user_name 
                                 FROM revenue r 
                                 LEFT JOIN patients pt ON r.patient_id=pt.id 
                                 LEFT JOIN users u ON r.user_id=u.id WHERE 1=1`;
                    const params = [];
                    if (startDate) {
                        query += ' AND CAST(r.timestamp AS DATE) >= @startDate';
                        params.push({ name: 'startDate', type: mssql.VarChar, value: startDate });
                    }
                    if (endDate) {
                        query += ' AND CAST(r.timestamp AS DATE) <= @endDate';
                        params.push({ name: 'endDate', type: mssql.VarChar, value: endDate });
                    }
                    if (source) {
                        query += ' AND r.source = @source';
                        params.push({ name: 'source', type: mssql.VarChar, value: source });
                    }
                    query += ' ORDER BY r.timestamp DESC';
                    const result = await sqlQuery(query, params);
                    res.json({ success: true, data: result.recordset });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        },
        {
            method: 'get',
            path: '/api/revenue/stats',
            handler: authenticated(async (req, res) => {
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const [todayTotal, todayCount, monthTotal, monthCount, allTotal] = await Promise.all([
                        sqlQuery('SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE CAST(timestamp AS DATE)=@today', [{ name: 'today', type: mssql.VarChar, value: today }]),
                        sqlQuery('SELECT COUNT(*) as cnt FROM revenue WHERE CAST(timestamp AS DATE)=@today', [{ name: 'today', type: mssql.VarChar, value: today }]),
                        sqlQuery('SELECT COALESCE(SUM(amount),0) as total FROM revenue WHERE MONTH(timestamp)=MONTH(GETDATE()) AND YEAR(timestamp)=YEAR(GETDATE())'),
                        sqlQuery('SELECT COUNT(*) as cnt FROM revenue WHERE MONTH(timestamp)=MONTH(GETDATE()) AND YEAR(timestamp)=YEAR(GETDATE())'),
                        sqlQuery('SELECT COALESCE(SUM(amount),0) as total FROM revenue')
                    ]);
                    res.json({
                        success: true,
                        stats: {
                            todayRevenue: todayTotal.recordset[0].total,
                            todayTransactionCount: todayCount.recordset[0].cnt,
                            monthlyRevenue: monthTotal.recordset[0].total,
                            monthlyTransactionCount: monthCount.recordset[0].cnt,
                            totalRevenue: allTotal.recordset[0].total
                        }
                    });
                } catch (err) { res.status(500).json({ success: false, error: err.message }); }
            })
        }
    ];
}

module.exports = { getRevenueRoutes };
