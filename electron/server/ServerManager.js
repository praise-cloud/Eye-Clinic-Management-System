const express = require('express');
const cors = require('cors');
const http = require('http');
const { initialize, close } = require('./database');
const { setupWebSocket, closeAll, getClientCount } = require('./websocket');
const { registerAllRoutes } = require('./routes');
const { getServerStatus } = require('./routes/server');

class ServerManager {
    constructor() {
        this.app = null;
        this.server = null;
        this.port = 3001;
        this.isRunning = false;
    }

    async start(config = {}) {
        if (this.isRunning) return { success: true, message: 'Server already running' };

        this.port = config.port || 3001;

        try {
            await initialize();
        } catch (err) {
            console.error('[Server] Database connection failed:', err.message);
            throw err;
        }

        this.app = express();
        this.app.use(cors({ origin: true, credentials: true }));
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        this.app.set('port', this.port);

        setupWebSocket(this.server);
        registerAllRoutes(this.app);

        this.server = http.createServer(this.app);

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, '0.0.0.0', (err) => {
                if (err) { reject(err); return; }
                this.isRunning = true;
                console.log(`[Server] Listening on port ${this.port}`);
                resolve({ success: true, port: this.port });
            });
        });
    }

    stop() {
        if (!this.isRunning) return Promise.resolve({ success: true });
        return new Promise((resolve) => {
            closeAll();
            this.server.close(async () => {
                await close();
                this.isRunning = false;
                console.log('[Server] Stopped');
                resolve({ success: true });
            });
        });
    }

    getStatus() {
        const status = getServerStatus();
        return {
            running: this.isRunning,
            port: this.port,
            clients: getClientCount(),
            ...status
        };
    }
}

module.exports = new ServerManager();
