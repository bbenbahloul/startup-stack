const { CONFIG, executeInContainer, waitForFile, generateRandomSecret } = require('./utils');
const { createClient } = require('./keycloak');

async function installMattermost(kcAdmin, domain) {
    console.log("🛠️  Configuring Mattermost (Chat)...");
    const secret = generateRandomSecret();
    
    // 1. Keycloak Setup
    const client = await createClient(kcAdmin, 'mattermost-client', secret, [`http://chat.${domain}/*`]);
    
    // 2. Mappers (Required for Gitlab plugin)
    await createGitLabMappers(kcAdmin, client.id);

    // 3. Container Config
    await waitForFile('mattermost', CONFIG.MM_SOCKET_PATH);
    await executeInContainer('mattermost', [`ln -sf ${CONFIG.MM_SOCKET_PATH} /var/tmp/mattermost_local.socket`]);

    const flags = `--local`;
    const cmds = [
        `mmctl ${flags} config set GitLabSettings.Enable true`,
        `mmctl ${flags} config set GitLabSettings.Id "mattermost-client"`,
        `mmctl ${flags} config set GitLabSettings.Secret "${secret}"`,
        `mmctl ${flags} config set GitLabSettings.AuthEndpoint "http://auth.${domain}/realms/${CONFIG.REALM_NAME}/protocol/openid-connect/auth"`,
        `mmctl ${flags} config set GitLabSettings.TokenEndpoint "${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.REALM_NAME}/protocol/openid-connect/token"`,
        `mmctl ${flags} config set GitLabSettings.UserApiEndpoint "${CONFIG.KEYCLOAK_URL}/realms/${CONFIG.REALM_NAME}/protocol/openid-connect/userinfo"`,
    ];

    try {
        await executeInContainer('mattermost', cmds);
    } catch (e) { console.warn("⚠️ Mattermost config partial skip (Env Vars locked)."); }

    console.log("🔄 Reloading Mattermost...");
    await executeInContainer('mattermost', [`mmctl ${flags} config reload`]);
    console.log("✅ Mattermost Configured!");
}

async function createGitLabMappers(kcAdmin, clientUuid) {
    const mappers = [
        { name: "gitlab-id", protocol: "openid-connect", protocolMapper: "oidc-usersessionmodel-note-mapper", config: { "user.session.note": "userModel.id", "claim.name": "id", "jsonType.label": "String", "id.token.claim": "true" } },
        { name: "gitlab-username", protocol: "openid-connect", protocolMapper: "oidc-usermodel-property-mapper", config: { "user.attribute": "username", "claim.name": "username", "jsonType.label": "String" } },
        { name: "gitlab-email", protocol: "openid-connect", protocolMapper: "oidc-usermodel-property-mapper", config: { "user.attribute": "email", "claim.name": "email", "jsonType.label": "String" } },
        { name: "gitlab-name", protocol: "openid-connect", protocolMapper: "oidc-full-name-mapper", config: { "claim.name": "name", "id.token.claim": "true" } }
    ];
    for (const mapper of mappers) {
        try { await kcAdmin.clients.addProtocolMapper({ realm: CONFIG.REALM_NAME, id: clientUuid }, mapper); } catch (e) {}
    }
}

module.exports = { installMattermost };