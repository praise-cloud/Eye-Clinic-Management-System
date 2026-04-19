import { useState, useEffect, useCallback, useRef } from 'react';

export default function useServerConnection() {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [serverPort, setServerPort] = useState(3001);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);

    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const pingTimer = useRef(null);
    const sessionLoadedRef = useRef(false);

    const clearTokens = () => {
        setAccessToken(null);
        setRefreshToken(null);
        setCurrentUser(null);
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('serverUser');
    };

    const connectWebSocket = useCallback((user) => {
        if (!serverUrl) return;
        if (wsRef.current) wsRef.current.close();

        const wsUrl = serverUrl.replace('http', 'ws');
        const websocket = new WebSocket(wsUrl);
        wsRef.current = websocket;

        websocket.onopen = () => {
            websocket.send(JSON.stringify({
                type: 'auth',
                userId: user?.id || null,
                userName: user?.name || null,
                userRole: user?.role || null,
                deviceName: localStorage.getItem('deviceName') || 'Unknown'
            }));
            setConnected(true);
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
                        window.dispatchEvent(new CustomEvent('server:presence', { detail: msg.data }));
                        break;
                    case 'connected':
                    case 'pong':
                        break;
                }
            } catch {}
        };

        websocket.onclose = () => {
            setConnected(false);
            clearInterval(pingTimer.current);
            reconnectTimer.current = setTimeout(() => {
                if (serverUrl && accessToken) connectWebSocket(currentUser || { id: null, name: null, role: null });
            }, 5000);
        };

        websocket.onerror = () => websocket.close();
    }, [serverUrl, accessToken, currentUser]);

    const loadSavedSession = useCallback(async () => {
        if (sessionLoadedRef.current) return;
        sessionLoadedRef.current = true;

        try {
            const savedUrl = localStorage.getItem('serverUrl');
            const savedPort = localStorage.getItem('serverPort');
            const savedAccess = sessionStorage.getItem('accessToken');
            const savedRefresh = sessionStorage.getItem('refreshToken');
            const savedUser = sessionStorage.getItem('serverUser');

            if (savedUrl) setServerUrl(savedUrl);
            if (savedPort) setServerPort(parseInt(savedPort) || 3001);
            if (savedAccess) setAccessToken(savedAccess);
            if (savedRefresh) setRefreshToken(savedRefresh);
            if (savedUser) setCurrentUser(JSON.parse(savedUser));
            if (window.electronAPI?.syncUser && savedAccess && savedUser) {
                await window.electronAPI.syncUser(JSON.parse(savedUser), savedAccess, savedRefresh);
            }

            if (savedAccess && savedUrl) {
                const res = await fetch(`${savedUrl}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${savedAccess}` }
                });
                const data = await res.json();
                if (data.success) {
                    setCurrentUser(data.user);
                    sessionStorage.setItem('serverUser', JSON.stringify(data.user));
                    setServerUrl(savedUrl);
                    setAccessToken(savedAccess);
                    setRefreshToken(savedRefresh);
                    if (window.electronAPI?.syncUser) {
                        await window.electronAPI.syncUser(data.user, savedAccess, savedRefresh);
                    }
                    connectWebSocket(data.user);
                } else {
                    sessionStorage.removeItem('accessToken');
                    sessionStorage.removeItem('refreshToken');
                    sessionStorage.removeItem('serverUser');
                    sessionLoadedRef.current = false;
                }
            }
        } catch {
            sessionLoadedRef.current = false;
        }
    }, [connectWebSocket]);

    const api = useCallback(async (endpoint, method = 'GET', body = null) => {
        if (!serverUrl) return { success: false, error: 'No server URL configured' };

        const headers = { 'Content-Type': 'application/json' };
        const token = sessionStorage.getItem('accessToken') || accessToken;
        if (token) headers['Authorization'] = `Bearer ${token}`;

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
                sessionStorage.setItem('accessToken', data.accessToken);
                sessionStorage.setItem('refreshToken', data.refreshToken);
                return true;
            }
        } catch {}
        clearTokens();
        sessionLoadedRef.current = false;
        return false;
    }, [serverUrl, refreshToken]);

    const connect = useCallback(async (serverIp, port = serverPort) => {
        const url = `http://${serverIp}:${port}`;
        setServerUrl(url);
        setServerPort(port);
        setConnecting(true);
        setError(null);

        try {
            const response = await fetch(`${url}/api/health`);
            if (!response.ok) throw new Error('Server unreachable');

            localStorage.setItem('serverUrl', url);
            localStorage.setItem('serverPort', port.toString());
            if (window.electronAPI?.setServerConfig) {
                await window.electronAPI.setServerConfig({ serverUrl: url, serverPort: port });
            }
            setConnected(true);
            setConnecting(false);
            return { success: true };
        } catch (err) {
            setConnected(false);
            setConnecting(false);
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, [serverPort]);

    const autoDetectServer = useCallback(async () => {
        setConnecting(true);
        setError(null);

        // Try localhost first
        const targets = ['localhost', '127.0.0.1'];

        // Get local IP to scan subnet
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            // Can't get local IP from browser, use common local network ranges
            const localIPs = [];
            for (let i = 1; i < 255; i++) {
                localIPs.push(`192.168.1.${i}`);
                localIPs.push(`192.168.0.${i}`);
                localIPs.push(`10.0.0.${i}`);
            }
            targets.push(...localIPs);
        } catch {
            // Add common IPs anyway
            for (let i = 1; i < 255; i++) {
                targets.push(`192.168.1.${i}`);
                targets.push(`192.168.0.${i}`);
            }
        }

        // Scan in parallel, but limit concurrency
        const scanBatch = async (batch) => {
            const promises = batch.map(async (ip) => {
                try {
                    const response = await fetch(`http://${ip}:${serverPort}/api/health`, { 
                        method: 'GET',
                        signal: AbortSignal.timeout(500)
                    });
                    if (response.ok) return ip;
                } catch {}
                return null;
            });
            const results = await Promise.all(promises);
            return results.find(ip => ip !== null);
        };

        // Scan in batches of 20
        for (let i = 0; i < targets.length; i += 20) {
            const batch = targets.slice(i, i + 20);
            const found = await scanBatch(batch);
            if (found) {
                setConnecting(false);
                return { success: true, ip: found, url: `http://${found}:${serverPort}` };
            }
        }

        setConnecting(false);
        return { success: false, error: 'Server not found on network' };
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
                localStorage.setItem('serverPort', serverPort.toString());
                if (window.electronAPI?.setServerConfig) {
                    await window.electronAPI.setServerConfig({ serverUrl: serverUrl, serverPort: serverPort });
                }
                sessionStorage.setItem('accessToken', data.accessToken);
                sessionStorage.setItem('refreshToken', data.refreshToken);
                sessionStorage.setItem('serverUser', JSON.stringify(data.user));
                if (window.electronAPI?.syncUser) {
                    await window.electronAPI.syncUser(data.user, data.accessToken, data.refreshToken);
                }

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
        sessionLoadedRef.current = false;
        setConnected(false);
    }, [accessToken, api]);

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
        serverPort,
        setServerPort,
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
