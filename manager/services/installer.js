const { setupRealmAndUser, createClient, loginAdminUser, getAuthenticatedClient } = require('./keycloak');
const { initDB, addService, isSystemInstalled } = require('./db');
const { waitForUrl } = require('./utils');
const { installMattermost } = require('./mattermost');
const { installForgejo } = require('./forgejo');

exports.runInstallation = async (email, password, domain, log = console.log) => {
    
    log("🔍 Checking system status...");
    await initDB(); 

    if (await isSystemInstalled()) {
        throw new Error("System is already installed.");
    }

    log("🚀 Starting Setup...");

    // 1. Wait for Keycloak
    log("⏳ Waiting for Keycloak...");
    await waitForUrl('http://keycloak:8080/realms/master');

    // 2. Configure Keycloak Realm/User
    log("🔐 Configuring Identity Provider...");
    const kcAdmin = await getAuthenticatedClient();
    await setupRealmAndUser(kcAdmin, email, password);

    // 3. Register Dashboard Client
    log("👉 Registering Dashboard Client...");
    await createClient(kcAdmin, 'manager-client', 'manager-secret', [
        `http://dashboard.${domain}/*`,
        `http://localhost:5173/*`
    ]);

    // 4. Install Services
    try {
        await installMattermost(kcAdmin, domain);
        log("✅ Mattermost Configured");
    } catch(e) {
        log(`❌ Mattermost Setup Failed: ${e.message}`);
    }

    try {
        // 👇 FIXED: Changed 'adminEmail' to 'email'
        await installForgejo(kcAdmin, domain, email); 
        log("✅ Forgejo Configured");
    } catch(e) {
        log(`❌ Forgejo Setup Failed: ${e.message}`);
    }

    // 5. Register Default Services
    log("💾 Saving Service Configuration...");
    const services = [
        {
            name: 'Identity',
            slug: 'keycloak',
            url: `http://auth.${domain}`,
            icon: 'Shield',
            description: 'User Management',
            login_path: null
        },
        {
            name: 'Chat',
            slug: 'mattermost',
            url: `http://chat.${domain}`,
            icon: 'MessageSquare',
            description: 'Team Communication',
            login_path: null
        },
        {
            name: 'Git',
            slug: 'forgejo',
            url: `http://git.${domain}`,
            icon: 'GitGraph',
            description: 'Code Hosting',
            login_path: '/user/oauth2/keycloak' 
        }
    ];

    for (const s of services) {
        await addService(s.name, s.slug, s.url, s.icon, s.description, s.login_path);
    }

    // 6. Login Admin (Programmatic)
    log("🎟️ Generating Admin Session...");
    const authData = await loginAdminUser(email, password);

    log("✅ Setup Complete");
    
    return { status: 'success', auth: authData };
};