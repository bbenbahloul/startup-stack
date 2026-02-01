const { CONFIG, waitForUrl } = require('./utils');

// 🔴 INTERNAL DOCKER URL (Crucial for Backend-to-Backend communication)
const INTERNAL_KC_URL = 'http://keycloak:8080';

/**
 * Connects to the Keycloak Admin API (Master Realm)
 */
async function getAuthenticatedClient() {
    // Wait for Keycloak to be ready on the internal network
    await waitForUrl(`${INTERNAL_KC_URL}/realms/master`);
    
    // Dynamic import for ESM library
    const { default: KcAdminClient } = await import('@keycloak/keycloak-admin-client');
    
    // Configure Admin Client to use the INTERNAL URL
    const kcAdmin = new KcAdminClient({ 
        baseUrl: INTERNAL_KC_URL, 
        realmName: 'master' 
    });
    
    await kcAdmin.auth({
        username: process.env.KEYCLOAK_ADMIN, 
        password: process.env.KEYCLOAK_ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli',
    });
    return kcAdmin;
}

async function setupRealmAndUser(kcAdmin, email, password) {
    // 1. Check if Realm Exists
    const realms = await kcAdmin.realms.find();
    if (!realms.some(r => r.realm === CONFIG.REALM_NAME)) {
        await kcAdmin.realms.create({ 
            id: CONFIG.REALM_NAME, 
            realm: CONFIG.REALM_NAME, 
            enabled: true, 
            registrationAllowed: false 
        });
        console.log("✅ Realm Created");
    }
    
    // 2. Create Admin User
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });
    const users = await kcAdmin.users.find({ username: email });
    if (users.length === 0) {
        await kcAdmin.users.create({
            username: email,
            email: email,
            emailVerified: true,
            enabled: true,
            credentials: [{ type: 'password', value: password, temporary: false }]
        });
        console.log("✅ Admin User Created");
    }
    
    // Switch back to master context
    kcAdmin.setConfig({ realmName: 'master' });
}

async function createClient(kcAdmin, clientId, secret, redirectUris) {
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });

    const clients = await kcAdmin.clients.find({ clientId });
    const attributes = { "post.logout.redirect.uris": "+" };

    if (clients.length > 0) {
        const client = clients[0];
        const newUris = [...new Set([...(client.redirectUris || []), ...redirectUris])];
        
        await kcAdmin.clients.update(
            { id: client.id },
            { redirectUris: newUris, attributes: { ...client.attributes, ...attributes } }
        );
        
        const secretData = await kcAdmin.clients.getClientSecret({ id: client.id });
        return { id: client.id, secret: secretData.value, created: false };
    }

    const c = await kcAdmin.clients.create({
        clientId,
        secret,
        serviceAccountsEnabled: true,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: true,
        redirectUris,
        attributes,
        webOrigins: ['+']
    });
    return { id: c.id, secret, created: true };
}

async function getAdminUserId(kcAdmin, email) {
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });
    const users = await kcAdmin.users.find({ username: email });
    if (users.length > 0) return users[0].id;
    throw new Error(`Could not find Keycloak User ID for ${email}`);
}

async function loginAdminUser(username, password) {
    // 🔴 Use Internal URL for Login
    const tokenEndpoint = `${INTERNAL_KC_URL}/realms/${CONFIG.REALM_NAME}/protocol/openid-connect/token`;
    
    try {
        const kcAdmin = await getAuthenticatedClient();
        kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });
        const clients = await kcAdmin.clients.find({ clientId: 'manager-client' });
        const secretData = await kcAdmin.clients.getClientSecret({ id: clients[0].id });
        
        const body = new URLSearchParams({
            'grant_type': 'password',
            'client_id': 'manager-client',
            'client_secret': secretData.value,
            'username': username,
            'password': password,
            'scope': 'openid' // Ensure scope is requested
        });

        const response = await fetch(tokenEndpoint, { method: 'POST', body: body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const data = await response.json();
        
        if (data.access_token) return { accessToken: data.access_token, refreshToken: data.refresh_token };
        return null;
    } catch (e) {
        console.error("Login Error:", e.message);
        return null;
    }
}

async function exchangeCodeForToken(code, redirectUri) {
    // 1. Get Client Secret
    const kcAdmin = await getAuthenticatedClient();
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });

    const clients = await kcAdmin.clients.find({ clientId: 'manager-client' });
    if (clients.length === 0) throw new Error("manager-client not found");
    
    const clientSecret = (await kcAdmin.clients.getClientSecret({ id: clients[0].id })).value;
    const authHeader = 'Basic ' + Buffer.from(`manager-client:${clientSecret}`).toString('base64');

    // 2. 🔴 Exchange Code using INTERNAL URL
    // Note: redirect_uri must match what the browser sent (Public URL), but the request goes to Internal URL
    const response = await fetch(`${INTERNAL_KC_URL}/realms/${CONFIG.REALM_NAME}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': authHeader },
        body: new URLSearchParams({ 
            'grant_type': 'authorization_code', 
            'code': code, 
            'redirect_uri': redirectUri,
            'scope': 'openid'
        })
    });
    
    const data = await response.json();
    if (data.error) {
        console.error("Keycloak Token Exchange Error:", data);
        return null;
    }
    return data.access_token ? { accessToken: data.access_token, refreshToken: data.refresh_token } : null;
}

// User Management Wrappers
async function listUsers() {
    const kcAdmin = await getAuthenticatedClient();
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });
    return await kcAdmin.users.find();
}

async function createUser(username, email, password) {
    const kcAdmin = await getAuthenticatedClient();
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });
    return await kcAdmin.users.create({
        username: username,
        email: email,
        emailVerified: true,
        enabled: true,
        credentials: [{ type: 'password', value: password, temporary: false }]
    });
}

async function deleteUser(userId) {
    const kcAdmin = await getAuthenticatedClient();
    kcAdmin.setConfig({ realmName: CONFIG.REALM_NAME });
    return await kcAdmin.users.del({ id: userId });
}

module.exports = { 
    getAuthenticatedClient, 
    setupRealmAndUser, 
    createClient, 
    getAdminUserId, 
    loginAdminUser, 
    exchangeCodeForToken, // Exported correctly now
    listUsers,
    createUser,
    deleteUser
};