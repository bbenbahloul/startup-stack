const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { getContainerLogs } = require('../services/docker');

router.use(requireAuth);

// GET /api/logs/:container
router.get('/:container', async (req, res) => {
    const { container } = req.params;
    
    // Security Whitelist: Only allow specific containers
    const ALLOWED_CONTAINERS = ['keycloak', 'manager', 'postgres', 'mattermost', 'forgejo', 'traefik'];
    
    if (!ALLOWED_CONTAINERS.includes(container)) {
        return res.status(403).json({ error: "Access denied to this container" });
    }

    try {
        const logs = await getContainerLogs(container);
        res.json({ logs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;