const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH_SECRET, ACCESS_TTL, REFRESH_TTL } = require('./config');

function generateTokens(user) {
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET, { expiresIn: ACCESS_TTL }
    );
    const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL }
    );
    return { accessToken, refreshToken };
}

function verifyAccess(token) {
    try { return jwt.verify(token, JWT_SECRET); }
    catch { return null; }
}

function verifyRefresh(token) {
    try { return jwt.verify(token, JWT_REFRESH_SECRET); }
    catch { return null; }
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const decoded = verifyAccess(header.split(' ')[1]);
    if (!decoded) return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    req.user = decoded;
    next();
}

function adminOnly(req, res, next) {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin access required' });
    next();
}

function doctorOnly(req, res, next) {
    if (!['admin', 'doctor'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'Doctor access required' });
    next();
}

function wrapHandler(middleware, ...additionalMiddleware) {
    return (handler) => (req, res, next) => {
        const chain = [middleware, ...additionalMiddleware, handler];
        let idx = 0;
        function nextHandler() {
            if (idx >= chain.length) return;
            const fn = chain[idx++];
            try {
                fn(req, res, nextHandler);
            } catch (err) {
                next(err);
            }
        }
        nextHandler();
    };
}

function authenticated(handler) {
    return wrapHandler(authMiddleware)(handler);
}

function authenticatedAdmin(handler) {
    return wrapHandler(authMiddleware, adminOnly)(handler);
}

function authenticatedDoctor(handler) {
    return wrapHandler(authMiddleware, doctorOnly)(handler);
}

function authenticatedDoctorOrAdmin(handler) {
    return wrapHandler(authMiddleware, (req, res, next) => {
        if (!['admin', 'doctor'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Doctor access required' });
        }
        next();
    })(handler);
}

module.exports = {
    generateTokens,
    verifyAccess,
    verifyRefresh,
    authMiddleware,
    adminOnly,
    doctorOnly,
    authenticated,
    authenticatedAdmin,
    authenticatedDoctor,
    authenticatedDoctorOrAdmin,
    wrapHandler
};
