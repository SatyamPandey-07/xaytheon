/**
 * XAYTHEON - Ingress Gateway Middleware
 * 
 * Simulates the entry point for global traffic. Automatically 
 * resolves the target region and tags the request for downstream 
 * orchestration.
 */

const orchestrator = require('../services/traffic-orchestrator.service');

const gatewayMiddleware = (req, res, next) => {
    // Mock user location (would usually come from GeoIP)
    const userLat = parseFloat(req.headers['x-user-lat']) || 40.7128; // default NY
    const userLon = parseFloat(req.headers['x-user-lon']) || -74.0060;

    const resolution = orchestrator.resolveTarget(userLat, userLon);

    // Inject orchestration context into request
    req.orchestration = {
        targetRegion: resolution.region,
        routingReason: resolution.reason,
        latencyImpact: resolution.metrics.latency
    };

    // Set headers for transparent monitoring
    res.setHeader('X-Xaytheon-Region', resolution.region);
    res.setHeader('X-Xaytheon-Orchestration', resolution.reason);

    next();
};

module.exports = gatewayMiddleware;
