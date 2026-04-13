const os = require('os');

function getHealthRoutes() {
    return [
        {
            method: 'get',
            path: '/api/health',
            handler: (req, res) => {
                const ifs = os.networkInterfaces();
                const ips = Object.values(ifs).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
                res.json({ status: 'ok', serverIp: ips[0] || '127.0.0.1', serverIps: ips });
            }
        }
    ];
}

module.exports = { getHealthRoutes };
