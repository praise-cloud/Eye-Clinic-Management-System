const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

let wss = null;
let connectedClients = new Map();

function setupWebSocket(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const clientId = uuidv4();
        const ip = req.socket.remoteAddress;
        connectedClients.set(clientId, { id: clientId, ip, ws, userId: null });

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                switch (data.type) {
                    case 'auth':
                        connectedClients.get(clientId).userId = data.userId;
                        broadcast('presence', { userId: data.userId, status: 'online', deviceName: data.deviceName });
                        break;
                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                        break;
                }
            } catch {}
        });

        ws.on('close', () => {
            const client = connectedClients.get(clientId);
            if (client?.userId) broadcast('presence', { userId: client.userId, status: 'offline' });
            connectedClients.delete(clientId);
        });
    });

    return wss;
}

function broadcast(event, data) {
    if (!wss) return;
    const msg = JSON.stringify({ type: event, data, timestamp: Date.now() });
    wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(msg);
    });
}

function sendToUser(userId, event, data) {
    const msg = JSON.stringify({ type: event, data, timestamp: Date.now() });
    connectedClients.forEach(client => {
        if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg);
        }
    });
}

function closeAll() {
    if (wss) {
        wss.clients.forEach(c => c.close());
    }
    connectedClients.clear();
}

function getConnectedClients() {
    return connectedClients;
}

function getClientCount() {
    return connectedClients.size;
}

module.exports = {
    setupWebSocket,
    broadcast,
    sendToUser,
    closeAll,
    getConnectedClients,
    getClientCount
};
