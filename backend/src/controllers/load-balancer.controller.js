/**
 * XAYTHEON - Load Balancer Controller
 * 
 * Manages API interaction for traffic monitoring and orchestration controls.
 */

const orchestrator = require('../services/traffic-orchestrator.service');
const health = require('../services/health-aggregator.service');

/**
 * Get global traffic and health status
 * GET /api/load-balancer/status
 */
exports.getStatus = (req, res) => {
    try {
        const summary = orchestrator.getOrchestrationSummary();
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching traffic status." });
    }
};

/**
 * Simulate a regional incident to test self-healing
 * POST /api/load-balancer/simulate-failure
 */
exports.simulateFailure = (req, res) => {
    try {
        const { regionId } = req.body;
        const success = health.simulateFailure(regionId);

        if (success) {
            res.json({ success: true, message: `Injected failure into region: ${regionId}` });
        } else {
            res.status(404).json({ success: false, message: "Region not found." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Failure simulation failed." });
    }
};

/**
 * Resolve target for a test location
 * POST /api/load-balancer/resolve
 */
exports.resolveTarget = (req, res) => {
    const { lat, lon } = req.body;
    const resolution = orchestrator.resolveTarget(lat, lon);
    res.json({ success: true, resolution });
};
