const { CONFIG } = require('../services/utils');

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    // 1. Check if header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // -----------------------------------------------------------
        // 🔴 CRITICAL FIX: Use Internal Docker URL
        // -----------------------------------------------------------
        // We cannot use the public URL (auth.lvh.me) inside the container.
        // We must use the service name defined in docker-compose.yml.
        const internalKeycloakUrl = 'http://keycloak:8080';
        
        // 2. Verify token with Keycloak (UserInfo Endpoint)
        const response = await fetch(`${internalKeycloakUrl}/realms/${CONFIG.REALM_NAME}/protocol/openid-connect/userinfo`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // Token is valid!
            const userInfo = await response.json();
            req.user = userInfo; 
            next();
        } else {
            console.warn(`Token verification rejected by Keycloak: ${response.status}`);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    } catch (e) {
        console.error("Auth Middleware Network Error:", e.message);
        // If Keycloak is down or unreachable, fail secure
        return res.status(500).json({ error: 'Authentication service unreachable' });
    }
}

module.exports = requireAuth;