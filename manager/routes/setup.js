// manager/routes/setup.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const installer = require('../services/installer');

// POST /setup - Run Installation (Streaming)
router.post('/', async (req, res) => {
    const { email, password } = req.body;
    const domain = process.env.DOMAIN || 'lvh.me';
    console.log(`⚡ Install requested for: ${email}`);

    // Headers for Streaming
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    const streamLogger = (message) => {
        console.log(`[Installer] ${message}`);
        res.write(JSON.stringify({ log: message }) + '\n');
    };

    try {
        const result = await installer.runInstallation(email, password, domain, streamLogger);
        fs.writeFileSync('./installed.lock', 'INSTALLED=true');
        res.write(JSON.stringify({ result }) + '\n');
        res.end();
    } catch (error) {
        console.error("Installation failed:", error);
        res.write(JSON.stringify({ error: error.message }) + '\n');
        res.end();
    }
});

module.exports = router;