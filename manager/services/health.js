// Internal Docker URLs for health checks
// These use the container names defined in docker-compose.yml
const SERVICE_MAP = {
    'keycloak': 'http://keycloak:8080',
    'mattermost': 'http://mattermost:8065',
    'forgejo': 'http://forgejo:3000',
    // If you add Bookstack later: 'bookstack': 'http://bookstack:80'
};

async function checkServiceHealth(slug) {
    const internalUrl = SERVICE_MAP[slug];
    if (!internalUrl) return 'unknown';

    try {
        // Set a short timeout so the dashboard doesn't hang
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(internalUrl, { 
            method: 'HEAD', // HEAD is lighter than GET
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        return res.ok || res.status === 404 || res.status === 401 ? 'online' : 'error';
    } catch (e) {
        return 'offline';
    }
}

async function getAllServicesStatus(servicesList) {
    const results = {};
    
    // Check all in parallel
    await Promise.all(servicesList.map(async (svc) => {
        results[svc.slug] = await checkServiceHealth(svc.slug);
    }));

    return results;
}

module.exports = { getAllServicesStatus };