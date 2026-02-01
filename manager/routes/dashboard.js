const express = require('express');
const router = express.Router();
const { exchangeCodeForToken } = require('../services/keycloak');
const { getServices } = require('../services/db');
const { getAllServicesStatus } = require('../services/health');
const requireAuth = require('../middleware/auth'); // 👈 Import Middleware

// 1. PUBLIC ROUTE (Token Exchange)
router.post('/api/token', async (req, res) => {
    // ... (Keep existing logic) ...
    const { code, redirectUri } = req.body;
    try {
        const authData = await exchangeCodeForToken(code, redirectUri);
        if (authData) res.json({ status: 'success', auth: authData });
        else res.status(401).json({ status: 'error' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. PROTECTED ROUTES (Apply Middleware)
// Everything below this line requires a valid token
router.use(requireAuth); 

// GET /api/auth/me (New: Simple check for Frontend Guard)
router.get('/me', (req, res) => {
    res.json({ status: 'active', user: req.user });
});

router.get('/services', async (req, res) => {
    try {
        const services = await getServices();
        res.json(services);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/status', async (req, res) => {
    try {
        const services = await getServices();
        const statusMap = await getAllServicesStatus(services);
        res.json(statusMap);
    } catch (e) { res.status(500).json({ error: "Health check failed" }); }
});

module.exports = router;