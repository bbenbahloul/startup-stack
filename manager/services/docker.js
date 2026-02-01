const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function getContainerLogs(containerName) {
    try {
        const container = docker.getContainer(containerName);
        
        // Inspect checks if container exists and is running
        await container.inspect();

        // Fetch logs
        const logsBuffer = await container.logs({
            follow: false, // We'll do polling for now, simpler than websockets
            stdout: true,
            stderr: true,
            tail: 100,     // Get last 100 lines
            timestamps: true
        });

        // Docker logs return raw bytes with header prefixes. 
        // We need to clean them up to get readable text.
        return cleanDockerLogs(logsBuffer);
    } catch (e) {
        console.error(`Error reading logs for ${containerName}:`, e.message);
        throw new Error(`Could not read logs for ${containerName}. Is it running?`);
    }
}

function cleanDockerLogs(buffer) {
    // Docker multiplexes stdout/stderr with an 8-byte header
    // We parse that out to get pure text.
    if (!buffer) return '';
    const logString = buffer.toString('utf8');
    
    // Regex to remove non-printable characters often found in raw streams
    // (This is a simplified cleaner, works for most cases)
    return logString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

module.exports = { getContainerLogs };