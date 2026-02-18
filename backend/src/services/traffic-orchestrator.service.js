/**
 * XAYTHEON - Traffic Orchestrator Service
 * 
 * The brains of the Autonomous Load Balancer. Decisions are made 
 * based on geographic proximity, regional health, and predicted saturation.
 */

const healthAggregator = require('./health-aggregator.service');
const geoRouting = require('../utils/geo-routing');

class TrafficOrchestratorService {
    constructor() {
        this.routingOverride = new Map(); // Manual overrides if any
        this.history = [];
    }

    /**
     * Resolve the optimal region for a user request
     */
    resolveTarget(userLat, userLon) {
        const nearestRegion = geoRouting.findNearestRegion(userLat, userLon);
        const healthMap = healthAggregator.getHealth();

        let targetRegion = nearestRegion;
        let reason = 'Geographic Proximity';

        // SELF-HEALING LOGIC: Detect if nearest region is unhealthy
        if (healthMap[nearestRegion].status !== 'HEALTHY') {
            // Find best alternative: High health score + Lower latency
            const candidates = Object.entries(healthMap)
                .filter(([id, status]) => status.status === 'HEALTHY')
                .sort((a, b) => b[1].score - a[1].score);

            if (candidates.length > 0) {
                targetRegion = candidates[0][0];
                reason = `Failover from ${nearestRegion} (Status: ${healthMap[nearestRegion].status})`;

                this.logRoutingEvent(nearestRegion, targetRegion, reason);
            }
        }

        return {
            region: targetRegion,
            reason,
            metrics: healthMap[targetRegion]
        };
    }

    logRoutingEvent(from, to, reason) {
        this.history.push({
            timestamp: Date.now(),
            from,
            to,
            reason
        });

        // Limit history size
        if (this.history.length > 100) this.history.shift();
    }

    getOrchestrationSummary() {
        return {
            activeOverrides: this.routingOverride.size,
            recentEvents: this.history.slice(-10),
            globalHealth: healthAggregator.getHealth()
        };
    }
}

module.exports = new TrafficOrchestratorService();
