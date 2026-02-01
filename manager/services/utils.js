const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const CONFIG = {
    KEYCLOAK_URL: 'http://keycloak:8080',
    REALM_NAME: 'startup-stack',
    MM_SOCKET_PATH: '/mattermost/mattermost_local.socket'
};

// 👇 UPDATED: Accepts 'options' to set the User (e.g., { user: '1000' })
async function executeInContainer(containerName, commands, options = {}) {
    const cmdString = Array.isArray(commands) ? commands.join(' && ') : commands;
    try {
        console.log(`🔌 Exec in ${containerName} (as ${options.user || 'root'}): ${cmdString.substring(0, 50)}...`);
        const container = docker.getContainer(containerName);
        
        const exec = await container.exec({
            Cmd: ['/bin/sh', '-c', cmdString],
            AttachStdout: true,
            AttachStderr: true,
            User: options.user || 'root' // Default to root if not specified
        });
        
        const stream = await exec.start();
        docker.modem.demuxStream(stream, process.stdout, process.stderr);
        
        await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
        });
    } catch (err) { throw err; }
}

async function waitForFile(containerName, filePath) {
    const container = docker.getContainer(containerName);
    let attempts = 0;
    console.log(`⏳ Polling for socket: ${filePath}...`);
    while (attempts < 30) {
        try {
            const exec = await container.exec({
                Cmd: ['/bin/sh', '-c', `if [ -S "${filePath}" ]; then echo "SOCKET_FOUND"; fi`],
                AttachStdout: true,
                AttachStderr: true
            });
            const stream = await exec.start();
            let output = '';
            stream.on('data', chunk => output += chunk.toString());
            await new Promise(r => stream.on('end', r));
            if (output.includes('SOCKET_FOUND')) return true;
        } catch (e) {}
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error(`❌ Timeout: Socket (${filePath}) missing.`);
}

async function waitForUrl(url) {
    console.log(`⏳ Waiting for ${url}...`);
    let attempts = 0;
    while (attempts < 60) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.status < 500) {
                console.log(`✅ Target is online (Status: ${res.status})`);
                return true;
            }
        } catch (e) {}
        
        attempts++;
        if (attempts % 2 === 0) process.stdout.write(".");
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("");
    throw new Error(`❌ Timeout waiting for ${url}. Check container logs.`);
}

function generateRandomSecret() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

module.exports = { docker, CONFIG, executeInContainer, waitForFile, waitForUrl, generateRandomSecret };