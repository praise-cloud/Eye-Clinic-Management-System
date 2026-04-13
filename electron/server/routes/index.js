const { getHealthRoutes } = require('./health');
const { getAuthRoutes } = require('./auth');
const { getPatientRoutes } = require('./patients');
const { getTestRoutes } = require('./tests');
const { getInventoryRoutes } = require('./inventory');
const { getPharmacyRoutes } = require('./pharmacy');
const { getPrescriptionRoutes } = require('./prescriptions');
const { getChatRoutes } = require('./chat');
const { getSettingsRoutes } = require('./settings');
const { getDashboardRoutes } = require('./dashboard');
const { getActivityLogRoutes } = require('./activity-logs');
const { getReportRoutes } = require('./reports');
const { getNotificationRoutes } = require('./notifications');
const { getPresenceRoutes } = require('./presence');
const { getUserRoutes } = require('./users');
const { getServerRoutes } = require('./server');

function registerAllRoutes(app) {
    const allRoutes = [
        ...getHealthRoutes(),
        ...getAuthRoutes(),
        ...getPatientRoutes(),
        ...getTestRoutes(),
        ...getInventoryRoutes(),
        ...getPharmacyRoutes(),
        ...getPrescriptionRoutes(),
        ...getChatRoutes(),
        ...getSettingsRoutes(),
        ...getDashboardRoutes(),
        ...getActivityLogRoutes(),
        ...getReportRoutes(),
        ...getNotificationRoutes(),
        ...getPresenceRoutes(),
        ...getUserRoutes(),
        ...getServerRoutes()
    ];

    for (const route of allRoutes) {
        switch (route.method) {
            case 'get': app.get(route.path, route.handler); break;
            case 'post': app.post(route.path, route.handler); break;
            case 'put': app.put(route.path, route.handler); break;
            case 'delete': app.delete(route.path, route.handler); break;
            case 'patch': app.patch(route.path, route.handler); break;
        }
    }

    console.log(`[Server] Registered ${allRoutes.length} routes`);
}

module.exports = { registerAllRoutes };
