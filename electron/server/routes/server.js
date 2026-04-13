const { authenticated, authenticatedAdmin } = require('../auth');
const { getClientCount } = require('../websocket');

function getServerStatus() {
    const os = require('os');
    const ifs = os.networkInterfaces();
    const ips = Object.values(ifs).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
    return {
        serverIp: ips[0] || '127.0.0.1',
        serverIps: ips
    };
}

function getServerRoutes() {
    return [
        {
            method: 'get',
            path: '/api/server/status',
            handler: authenticated(async (req, res) => {
                authenticatedAdmin(async (reqInner, resInner) => {
                    const status = getServerStatus();
                    resInner.json({
                        success: true,
                        status: {
                            running: true,
                            port: req.app.get('port') || 3001,
                            clients: getClientCount(),
                            ...status
                        }
                    });
                })(req, res, () => {});
            })
        }
    ];
}

module.exports = { getServerRoutes, getServerStatus };
