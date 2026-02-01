const express = require('express');
const path = require('path');
const { isSystemInstalled, initDB } = require('./services/db'); // 👈 Import initDB

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------------------------------------------------
// 1. API ROUTES
// ---------------------------------------------------------

// System Status (Check DB instead of File)
app.get('/api/status', async (req, res) => {
    try {
        const installed = await isSystemInstalled();
        res.json({ installed });
    } catch (e) {
        console.error("Status check error:", e);
        res.json({ installed: false, error: e.message });
    }
});

// Mount routes
app.use('/api/setup', require('./routes/setup'));
app.use('/api/users', require('./routes/users'));     
app.use('/api/auth', require('./routes/dashboard'));  
app.use('/api/logs', require('./routes/logs'));

// ---------------------------------------------------------
// 2. SERVE REACT FRONTEND
// ---------------------------------------------------------
const clientBuildPath = path.join(__dirname, 'client/dist');
app.use(express.static(clientBuildPath));

// ---------------------------------------------------------
// 3. CATCH-ALL
// ---------------------------------------------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ---------------------------------------------------------
// 4. STARTUP SEQUENCE
// ---------------------------------------------------------
const PORT = 3000;

async function startServer() {
    try {
        // 1. Initialize Database (Create Tables) BEFORE listening
        console.log("⏳ Initializing Database...");
        await initDB(); 
        
        // 2. Start Listening
        app.listen(PORT, () => {
            console.log(`✅ Manager running on port ${PORT}`);
        });
    } catch (e) {
        console.error("❌ Failed to start server:", e);
        process.exit(1);
    }
}

startServer();