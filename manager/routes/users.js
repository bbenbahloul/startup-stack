const express = require('express');
const router = express.Router();
const { listUsers, createUser, deleteUser } = require('../services/keycloak');
const requireAuth = require('../middleware/auth');

// Protect ALL routes in this file
router.use(requireAuth);

// ✅ Correct Path: /list (because server.js adds /api/users)
// Resulting URL: /api/users/list
router.get('/list', async (req, res) => {
    try {
        const users = await listUsers();
        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ✅ Correct Path: /create
// Resulting URL: /api/users/create
router.post('/create', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        await createUser(username, email, password);
        res.json({ status: 'success' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ✅ Correct Path: /delete/:id
// Resulting URL: /api/users/delete/:id
router.delete('/delete/:id', async (req, res) => {
    try {
        await deleteUser(req.params.id);
        res.json({ status: 'success' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;