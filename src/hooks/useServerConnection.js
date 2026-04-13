import { useState, useEffect, useCallback, useRef } from 'react';

export default function useServerConnection() {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);

    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const pingTimer = useRef(null);

    const clearTokens = () => {
        setAccessToken(null);
        setRefreshToken(null);
        setCurrentUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('serverUser');
    };

    const loadSavedSession = useCallback(() => {
        try {
            const savedUrl = localStorage.getItem('serverUrl');
            const savedAccess = localStorage.getItem('accessToken');
            const savedRefresh = localStorage.getItem('refreshToken');
            const savedUser = localStorage.getItem('serverUser');
            if (savedUrl) setServerUrl(savedUrl);
            if (savedAccess) setAccessToken(savedAccess);
            if (savedRefresh) setRefreshToken(savedRefresh);
            if (savedUser) setCurrentUser(JSON.parse(savedUser));
        } catch {}
    }, []);

    const api = useCallback(async (endpoint, method = 'GET', body = null) => {
        if (!serverUrl) return { success: false, error: 'No server URL configured' };

        const headers = { 'Content-Type': 'application/json' };
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

        let response = await fetch(`${serverUrl}${endpoint}`, {
            method,
            headers,
            body: body != null ? JSON.stringify(body) : null
        });

        if (response.status === 401 && refreshToken) {
            const refreshed = await refresh();
            if (refreshed && accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
                response = await fetch(`${serverUrl}${endpoint}`, { method, headers, body: body != null ? JSON.stringify(body) : null });
            }
        }

        return response.json();
    }, [serverUrl, accessToken, refreshToken]);

    const refresh = useCallback(async () => {
        if (!serverUrl || !refreshToken) return false;
        try {
            const response = await fetch(`${serverUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            const data = await response.json();
            if (data.success) {
                setAccessToken(data.accessToken);
                setRefreshToken(data.refreshToken);
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                return true;
            }
        } catch {}
        clearTokens();
        return false;
    }, [serverUrl, refreshToken]);

    const connect = useCallback(async (serverIp, port = 3001) => {
        const url = `http://${serverIp}:${port}`;
        setServerUrl(url);
        setConnecting(true);
        setError(null);

        try {
            const response = await fetch(`${url}/api/health`);
            if (!response.ok) throw new Error('Server unreachable');

            localStorage.setItem('serverUrl', url);
            setConnected(true);
            setConnecting(false);
            return { success: true };
        } catch (err) {
            setConnected(false);
            setConnecting(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    const login = useCallback(async (email, password) => {
        if (!serverUrl) return { success: false, error: 'Not connected to server' };

        try {
            const response = await fetch(`${serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (data.success) {
                setAccessToken(data.accessToken);
                setRefreshToken(data.refreshToken);
                setCurrentUser(data.user);

                localStorage.setItem('serverUrl', serverUrl);
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('serverUser', JSON.stringify(data.user));

                connectWebSocket(data.user);
            }

            return data;
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [serverUrl, connectWebSocket]);

    const logout = useCallback(async () => {
        try {
            if (accessToken) await api('/api/auth/logout', 'POST');
        } catch {}
        if (wsRef.current) wsRef.current.close();
        clearTokens();
        setConnected(false);
    }, [accessToken, api]);

    const connectWebSocket = useCallback((user) => {
        if (!serverUrl) return;
        if (wsRef.current) wsRef.current.close();

        const wsUrl = serverUrl.replace('http', 'ws');
        const websocket = new WebSocket(wsUrl);
        wsRef.current = websocket;

        websocket.onopen = () => {
            websocket.send(JSON.stringify({
                type: 'auth',
                userId: user.id,
                userName: user.name,
                userRole: user.role,
                deviceName: localStorage.getItem('deviceName') || 'Unknown'
            }));
            pingTimer.current = setInterval(() => {
                if (websocket.readyState === WebSocket.OPEN) websocket.send(JSON.stringify({ type: 'ping' }));
            }, 30000);
        };

        websocket.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case 'data:update':
                        window.dispatchEvent(new CustomEvent('server:dataUpdate', { detail: msg.data }));
                        break;
                    case 'chat:message':
                        window.dispatchEvent(new CustomEvent('server:chatMessage', { detail: msg.data }));
                        break;
                    case 'presence':
                        setOnlineUsers(prev => {
                            const exists = prev.find(u => u.userId === msg.data.userId);
                            if (msg.data.status === 'offline') return prev.filter(u => u.userId !== msg.data.userId);
                            if (exists) return prev.map(u => u.userId === msg.data.userId ? { ...u, ...msg.data } : u);
                            return [...prev, msg.data];
                        });
                        break;
                    case 'connected':
                    case 'pong':
                        break;
                }
            } catch {}
        };

        websocket.onclose = () => {
            clearInterval(pingTimer.current);
            reconnectTimer.current = setTimeout(() => {
                if (serverUrl && accessToken) connectWebSocket(currentUser || { id: null, name: null, role: null });
            }, 5000);
        };

        websocket.onerror = () => websocket.close();
    }, [serverUrl, accessToken, currentUser]);

    const fetchOnlineUsers = useCallback(async () => {
        const data = await api('/api/presence/online');
        if (data.success) {
            setOnlineUsers(data.users || []);
        }
    }, [api]);

    useEffect(() => {
        loadSavedSession();
    }, [loadSavedSession]);

    useEffect(() => {
        if (accessToken && serverUrl && !wsRef.current) {
            connectWebSocket(currentUser || { id: null, name: null, role: null });
        }
    }, [accessToken, serverUrl]);

    useEffect(() => {
        return () => {
            clearInterval(pingTimer.current);
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    return {
        connected,
        connecting,
        serverUrl,
        error,
        currentUser,
        onlineUsers,
        accessToken,
        connect,
        login,
        logout,
        api,
        refresh,
        fetchOnlineUsers
    };
}
