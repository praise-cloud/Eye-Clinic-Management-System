import { useState, useEffect, useCallback } from 'react';

const DEFAULT_SERVER_URL = 'http://localhost:3001';

export default function useServerConnection() {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [ws, setWs] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const connect = useCallback(async (serverIp, port = 3001) => {
        const url = `http://${serverIp}:${port}`;
        setServerUrl(url);
        setConnecting(true);
        setError(null);

        try {
            // Test connection with a simple request
            const response = await fetch(`${url}/api/config`);
            if (!response.ok) {
                throw new Error('Cannot connect to server');
            }
            
            setConnected(true);
            setConnecting(false);
            
            // Store server config
            localStorage.setItem('serverUrl', url);
            
            return { success: true };
        } catch (err) {
            setConnected(false);
            setConnecting(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    const disconnect = useCallback(() => {
        if (ws) {
            ws.close();
            setWs(null);
        }
        setConnected(false);
        localStorage.removeItem('serverUrl');
    }, [ws]);

    const login = useCallback(async (email, password) => {
        if (!serverUrl) {
            return { success: false, error: 'Not connected to server' };
        }

        try {
            const response = await fetch(`${serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setCurrentUser(data.user);
                // Connect WebSocket
                connectWebSocket(data.user);
            }
            
            return data;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [serverUrl]);

    const connectWebSocket = useCallback((user) => {
        const wsUrl = serverUrl.replace('http', 'ws');
        const websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
            websocket.send(JSON.stringify({
                type: 'auth',
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                deviceName: localStorage.getItem('deviceName') || 'Unknown'
            }));
        };

        websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleWebSocketMessage(message);
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        };

        websocket.onclose = () => {
            setConnected(false);
        };

        websocket.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        setWs(websocket);
    }, [serverUrl]);

    const handleWebSocketMessage = useCallback((message) => {
        switch (message.type) {
            case 'data:update':
                window.dispatchEvent(new CustomEvent('server:dataUpdate', { detail: message.data }));
                break;
            case 'chat:message':
                window.dispatchEvent(new CustomEvent('server:chatMessage', { detail: message.data }));
                break;
            case 'user:presence':
                setOnlineUsers(prev => {
                    const exists = prev.find(u => u.userId === message.data.userId);
                    if (exists) {
                        return prev.map(u => u.userId === message.data.userId ? message.data : u);
                    }
                    return [...prev, message.data];
                });
                break;
            case 'client:disconnect':
                setOnlineUsers(prev => prev.filter(u => u.userId !== message.data.userId));
                break;
            default:
                break;
        }
    }, []);

    const apiCall = useCallback(async (endpoint, method = 'GET', body = null) => {
        if (!connected) {
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
            
            const response = await fetch(`${serverUrl}${endpoint}`, options);
            const data = await response.json();
            return data;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [connected, serverUrl]);

    // Load saved server URL on mount
    useEffect(() => {
        const savedUrl = localStorage.getItem('serverUrl');
        if (savedUrl) {
            setServerUrl(savedUrl);
        }
    }, []);

    return {
        connected,
        connecting,
        serverUrl,
        error,
        currentUser,
        onlineUsers,
        connect,
        disconnect,
        login,
        apiCall
    };
}