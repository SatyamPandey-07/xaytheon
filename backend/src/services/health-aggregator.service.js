/**
 * XAYTHEON - Health Aggregator Service
 * 
 * Collects and normalizes health signals from global regions to 
 * drive traffic orchestration decisions.
 */

const { REGIONS } = require('../utils/geo-routing');

class HealthAggregatorService {
    constructor() {
        this.regionalHealth = {};
        this.init();
    }

    init() {
        // Initialize all regions with perfect health
        Object.keys(REGIONS).forEach(regionId => {
            this.regionalHealth[regionId] = {
                status: 'HEALTHY',
                score: 1.0, // 0.0 to 1.0
                latency: 50, // ms
                saturation: 0.1, // 0.0 to 1.0 (load)
                lastUpdate: Date.now()
            };
        });

        // Start background oscillation (simulated traffic/noise)
        setInterval(() => this.updateRegionalHealth(), 5000);
    }

    updateRegionalHealth() {
        Object.keys(this.regionalHealth).forEach(id => {
            const h = this.regionalHealth[id];

            // Randomly fluctuate metrics
            h.latency = Math.max(20, h.latency + (Math.random() * 10 - 5));
            h.saturation = Math.min(1.0, Math.max(0, h.saturation + (Math.random() * 0.1 - 0.05)));

            // Calculate overall score
            h.score = 1.0 - (h.saturation * 0.5) - (Math.min(1.0, h.latency / 500) * 0.5);

            if (h.score < 0.4) h.status = 'CRITICAL';
            else if (h.score < 0.7) h.status = 'DEGRADED';
            else h.status = 'HEALTHY';

            h.lastUpdate = Date.now();
        });
    }

    getHealth() {
        return this.regionalHealth;
    }

    /**
     * Manually trigger a regional failure for testing self-healing
     */
    simulateFailure(regionId) {
        if (this.regionalHealth[regionId]) {
            this.regionalHealth[regionId].status = 'CRITICAL';
            this.regionalHealth[regionId].score = 0.1;
            this.regionalHealth[regionId].saturation = 1.0;
            this.regionalHealth[regionId].latency = 2000;
            return true;
        }
        return false;
    }
}

module.exports = new HealthAggregatorService();
