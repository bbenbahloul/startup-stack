const { CONFIG, executeInContainer, waitForUrl, generateRandomSecret, docker } = require('./utils');
const { createClient, getAdminUserId } = require('./keycloak');

async function installForgejo(kcAdmin, domain, adminEmail) {
    console.log("🛠️  Configuring Forgejo (Git)...");
    const secret = generateRandomSecret();

    // 1. Keycloak Setup
    // CLEANUP: We removed the dashboard URLs because we now have a dedicated 'manager-client'
    const client = await createClient(kcAdmin, 'forgejo-client', secret, [
        `http://git.${domain}/user/oauth2/keycloak/callback`
    ]);
    
    const keycloakUserId = await getAdminUserId(kcAdmin, adminEmail);
    await createForgejoMappers(kcAdmin, client.id);

    // 2. Wait for Container
    await waitForUrl(`http://forgejo:3000/`);

    // 3. INJECT CONFIGURATION
    console.log("⚙️  Injecting Forgejo configuration...");
    const setupCmd = `
        mkdir -p /data/gitea/conf &&
        echo "[server]
DOMAIN = git.${domain}
ROOT_URL = http://git.${domain}/
HTTP_PORT = 3000

[database]
DB_TYPE = postgres
HOST = forgejo-db:5432
NAME = forgejo
USER = forgejo
PASSWD = \${FORGEJO__database__PASSWD}

[service]
DISABLE_REGISTRATION = false
ALLOW_ONLY_EXTERNAL_REGISTRATION = true
SHOW_REGISTRATION_BUTTON = false
AUTO_LINK_NEW_USER = true

[security]
INSTALL_LOCK = true
SECRET_KEY = ${generateRandomSecret()}

[openid]
ENABLE_OPENID_SIGNIN = true
ENABLE_OPENID_SIGNUP = true
" > /data/gitea/conf/app.ini
    `;

    try {
        await executeInContainer('forgejo', setupCmd, { user: '1000' });
        console.log("✅ Configuration injected.");
    } catch (e) {
        console.warn("⚠️  Config injection warning:", e.message);
    }

    // 4. Restart Forgejo
    console.log("🔄 Restarting Forgejo to apply config...");
    const container = docker.getContainer('forgejo');
    await container.restart();
    await waitForUrl(`http://forgejo:3000/`);
    await new Promise(r => setTimeout(r, 5000));

    // 5. CONFIGURE SSO
    console.log("🔑 Configuring SSO Provider...");
    const discoveryUrl = `${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.REALM_NAME}/.well-known/openid-configuration`;
    
    const ssoCmd = [
        `forgejo admin auth add-oauth`,
        `--name keycloak`,
        `--provider openidConnect`,
        `--key "forgejo-client"`,
        `--secret "${secret}"`,
        `--auto-discover-url "${discoveryUrl}"`
    ].join(' '); 

    try {
        await executeInContainer('forgejo', ssoCmd, { user: '1000' });
        console.log("✅ Forgejo SSO Configured!");
    } catch (e) {
        console.log("ℹ️  Forgejo SSO configuration skipped.");
    }

    // 6. CREATE LOCAL ADMIN
    console.log("👤 Creating Forgejo Admin...");
    try {
        await executeInContainer('forgejo', [
            `forgejo admin user create --admin --username gitadmin --password "${process.env.KEYCLOAK_ADMIN_PASSWORD}" --email "${adminEmail}" || true`
        ], { user: '1000' });
        console.log("✅ Forgejo Admin Created");
    } catch (e) {
        console.log("ℹ️  Admin creation skipped.");
    }

    // 7. THE UNIVERSAL LINK (Hybrid Method)
    console.log("🔗 Linking Accounts...");
    try {
        // A. Get Auth Source ID (CLI)
        const authOut = await getContainerOutput('forgejo', 'forgejo admin auth list', { user: '1000' });
        const authMatch = authOut.match(/(\d+)\s+keycloak/);
        const authId = authMatch ? authMatch[1] : null;

        // B. Get User ID (CLI)
        const userOut = await getContainerOutput('forgejo', 'forgejo admin user list --admin', { user: '1000' });
        const userMatch = userOut.match(/(\d+)\s+gitadmin/);
        const userId = userMatch ? userMatch[1] : null;

        if (authId && userId) {
            console.log(`ℹ️  Linking User ID ${userId} to Auth ID ${authId}`);
            
            // C. Insert Link (SQL)
            const sqlLinkCmd = `
                INSERT INTO external_login_user (external_id, user_id, login_source_id, provider, email)
                VALUES ('${keycloakUserId}', ${userId}, ${authId}, 'openidConnect', '${adminEmail}')
                ON CONFLICT (external_id, login_source_id) DO NOTHING;
            `;
            
            await executeInContainer('forgejo-db', [
                `psql -U forgejo -d forgejo -c "${sqlLinkCmd}"`
            ]);
            console.log("✅ Accounts Linked Successfully!");
        } else {
            console.warn("⚠️  Could not find IDs. Link skipped.");
        }
    } catch (e) {
        console.error("❌ Link failed:", e.message);
    }
}

// Helper to capture command output
async function getContainerOutput(containerName, command, options = {}) {
    const container = docker.getContainer(containerName);
    const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        User: options.user || 'root'
    });

    const stream = await exec.start();
    let output = '';
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => output += chunk.toString('utf8'));
        stream.on('end', () => resolve(output));
        stream.on('error', reject);
    });
}

async function createForgejoMappers(kcAdmin, clientUuid) {
    const mappers = [
        { name: "username", protocol: "openid-connect", protocolMapper: "oidc-usermodel-property-mapper", config: { "user.attribute": "id", "claim.name": "preferred_username", "jsonType.label": "String", "id.token.claim": "true", "access.token.claim": "true", "userinfo.token.claim": "true" } },
        { name: "email", protocol: "openid-connect", protocolMapper: "oidc-usermodel-property-mapper", config: { "user.attribute": "email", "claim.name": "email", "jsonType.label": "String", "id.token.claim": "true", "access.token.claim": "true", "userinfo.token.claim": "true" } },
        { name: "full name", protocol: "openid-connect", protocolMapper: "oidc-full-name-mapper", config: { "claim.name": "name", "id.token.claim": "true", "access.token.claim": "true", "userinfo.token.claim": "true" } }
    ];
    for (const mapper of mappers) {
        try { await kcAdmin.clients.addProtocolMapper({ realm: CONFIG.REALM_NAME, id: clientUuid }, mapper); } catch (e) {}
    }
}

module.exports = { installForgejo };