import { useState, useEffect, useCallback } from 'react';

const DEFAULT_SERVER_URL = 'http://localhost:3001';

class DataServiceClient {
    constructor() {
        this.serverUrl = '';
        this.isServerMode = false;
        this.listeners = new Map();
    }

    initialize() {
        const savedUrl = localStorage.getItem('serverUrl');
        if (savedUrl) {
            this.serverUrl = savedUrl;
            this.isServerMode = true;
        }
    }

    setServerMode(url) {
        this.serverUrl = url;
        this.isServerMode = !!url;
        if (url) {
            localStorage.setItem('serverUrl', url);
        } else {
            localStorage.removeItem('serverUrl');
        }
    }

    getServerUrl() {
        return this.serverUrl;
    }

    isConnected() {
        return this.isServerMode && !!this.serverUrl;
    }

    async apiCall(endpoint, method = 'GET', body = null) {
        if (!this.isServerMode || !this.serverUrl) {
            return { success: false, error: 'Not connected to server' };
        }

        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.serverUrl}${endpoint}`, options);
            const data = await response.json();
            return data;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.listeners.get(event).delete(callback);
    }

    notify(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(data));
        }
        window.dispatchEvent(new CustomEvent(`server:${event}`, { detail: data }));
    }
}

const dataService = new DataServiceClient();
dataService.initialize();

export default function useDataService() {
    const [connected, setConnected] = useState(dataService.isConnected());
    const [serverUrl, setServerUrl] = useState(dataService.getServerUrl());

    useEffect(() => {
        const handleConnectionChange = (e) => {
            setConnected(e.detail?.connected || false);
            setServerUrl(e.detail?.serverUrl || '');
        };

        window.addEventListener('server:connectionChange', handleConnectionChange);
        return () => window.removeEventListener('server:connectionChange', handleConnectionChange);
    }, []);

    const connect = useCallback(async (serverIp, port = 3001) => {
        const url = `http://${serverIp}:${port}`;
        
        try {
            const response = await fetch(`${url}/api/config`);
            if (!response.ok) {
                throw new Error('Cannot connect to server');
            }
            
            dataService.setServerMode(url);
            setConnected(true);
            setServerUrl(url);
            
            window.dispatchEvent(new CustomEvent('server:connectionChange', { 
                detail: { connected: true, serverUrl: url } 
            }));
            
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const disconnect = useCallback(() => {
        dataService.setServerMode('');
        setConnected(false);
        setServerUrl('');
        
        window.dispatchEvent(new CustomEvent('server:connectionChange', { 
            detail: { connected: false, serverUrl: '' } 
        }));
    }, []);

    const localCall = useCallback(async (method, ...args) => {
        if (window.electronAPI?.[method]) {
            return await window.electronAPI[method](...args);
        }
        console.warn(`Method ${method} not available on electronAPI`);
        return { success: false, error: `Method ${method} not available` };
    }, []);

    const serverCall = useCallback(async (endpoint, method = 'GET', body = null) => {
        return await dataService.apiCall(endpoint, method, body);
    }, []);

    const execute = useCallback(async (method, ...args) => {
        if (dataService.isConnected()) {
            return await dataService.apiCall(method, ...args);
        }
        return await localCall(method, ...args);
    }, [localCall]);

    return {
        connected,
        serverUrl,
        connect,
        disconnect,
        execute,
        localCall,
        serverCall,
        apiCall: dataService.apiCall.bind(dataService),
        subscribe: dataService.subscribe.bind(dataService),
        notify: dataService.notify.bind(dataService)
    };
}

export { dataService };