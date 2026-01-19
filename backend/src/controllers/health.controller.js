const buildService = require('../services/build-monitor.service');

exports.getHealthSummary = (req, res) => {
    try {
        const data = buildService.getDashboardData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch health summary" });
    }
};

/**
 * GitHub Webhook Receiver
 */
exports.githubWebhook = async (req, res) => {
    try {
        const event = req.headers['x-github-event'];
        const payload = req.body;

        if (event === 'workflow_run') {
            const repo = payload.repository.full_name;
            const status = payload.workflow_run.conclusion === 'success' ? 'success' :
                payload.workflow_run.conclusion === 'failure' ? 'failure' : 'in_progress';

            await buildService.handleBuildUpdate(repo, {
                buildId: payload.workflow_run.id.toString(),
                status: status,
                logs: 'Automatic logs from GitHub Actions...'
            });
        }

        res.status(200).send('Webhook processed');
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Internal Error');
    }
};

/**
 * Endpoint to trigger a mock build update (for testing/demo)
 */
exports.triggerMockUpdate = async (req, res) => {
    try {
        const { repo, status, logs } = req.body;
        const result = await buildService.handleBuildUpdate(repo || 'SatyamPandey-07/xaytheon', {
            buildId: `build-${Date.now()}`,
            status: status || 'success',
            logs: logs || ''
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Trigger failed" });
    }
};
