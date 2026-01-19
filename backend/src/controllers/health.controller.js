const healthService = require('../services/health-monitor.service');

exports.getHealthSummary = (req, res) => {
    try {
        const data = healthService.getDashboardData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch health summary" });
    }
};

/**
 * Endpoint to trigger a mock build update (for testing/demo)
 */
exports.triggerMockUpdate = async (req, res) => {
    try {
        const { repo, status, logs } = req.body;
        const result = await healthService.handleBuildUpdate(repo || 'SatyamPandey-07/xaytheon', {
            buildId: `build-${Date.now()}`,
            status: status || 'success',
            logs: logs || ''
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Trigger failed" });
    }
};
