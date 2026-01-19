const { getIO } = require('../socket/socket.server');
const llmService = require('./llm.service');

class HealthMonitorService {
    constructor() {
        this.activeBuilds = new Map();
        this.repoHealth = new Map(); // repoName -> 'healthy' | 'warning' | 'error'
    }

    /**
     * Simulates receiving a build status update from GitHub Webhook
     */
    async handleBuildUpdate(repoName, buildData) {
        const { status, buildId, logs } = buildData;

        this.activeBuilds.set(buildId, { ...buildData, timestamp: new Date() });
        this.updateRepoHealth(repoName, status);

        let aiAnalysis = null;
        if (status === 'failure' && logs) {
            aiAnalysis = await this.analyzeFailureLogs(logs);
        }

        const updatePayload = {
            repoName,
            buildId,
            status,
            aiAnalysis,
            timestamp: new Date()
        };

        // Broadcast real-time update via Socket.io
        try {
            const io = getIO();
            io.emit('build_update', updatePayload);
        } catch (err) {
            console.error("Socket error in HealthMonitor", err);
        }

        return updatePayload;
    }

    updateRepoHealth(repoName, status) {
        if (status === 'failure') {
            this.repoHealth.set(repoName, 'error');
        } else if (status === 'success') {
            this.repoHealth.set(repoName, 'healthy');
        } else {
            this.repoHealth.set(repoName, 'warning');
        }
    }

    async analyzeFailureLogs(logs) {
        const prompt = `The following build just failed. Analyze the logs and suggest a concise fix.
        LOGS:
        ${logs.slice(-500)} // Last 500 chars 
        `;

        // Use existing LLM service
        const analysis = await llmService.generateResponse(prompt, "CI/CD Log Analysis Context");
        return analysis;
    }

    getDashboardData() {
        return {
            repos: Array.from(this.repoHealth.entries()).map(([name, status]) => ({ name, status })),
            recentBuilds: Array.from(this.activeBuilds.values()).slice(-5)
        };
    }
}

module.exports = new HealthMonitorService();
