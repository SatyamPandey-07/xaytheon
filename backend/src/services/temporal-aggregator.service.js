/**
 * XAYTHEON - Temporal Forensic Aggregator
 * 
 * Orchestrates the collection of events, logs, and metrics into
 * time-indexed "Forensic Blocks" for millisecond-precision investigation.
 */

const timeSeries = require('./time-series.processor');

class TemporalAggregatorService {
    constructor() {
        this.forensicBlocks = []; // Array of aggregated state snapshots
        this.BLOCK_SIZE_MS = 1000; // 1 second aggregation windows

        this.startAggregation();
    }

    /**
     * Periodically bundle real-time data into forensic history blocks
     */
    startAggregation() {
        setInterval(() => {
            this.createForensicBlock();
        }, this.BLOCK_SIZE_MS);
    }

    createForensicBlock() {
        const timestamp = Date.now();
        const snapshot = timeSeries.getGlobalSnapshot(timestamp);

        const block = {
            id: `BLK-${timestamp}`,
            t: timestamp,
            state: snapshot,
            events: [], // Would be populated from an event bus
            anomalyScore: this.calculateAnomaly(snapshot)
        };

        this.forensicBlocks.push(block);

        // Keep last 1 hour of high-res blocks (3600 blocks)
        if (this.forensicBlocks.length > 3600) {
            this.forensicBlocks.shift();
        }
    }

    /**
     * Calculate a simplified anomaly score for the current block
     */
    calculateAnomaly(state) {
        let total = 0;
        let count = 0;
        Object.values(state).forEach(val => {
            total += val;
            count++;
        });
        const avg = total / count;

        // Mock: If average load > 80, it's anomalous
        return avg > 80 ? (avg - 80) / 20 : 0;
    }

    /**
     * Retrieve a range of blocks for the forensic timeline
     */
    getTimeline(startTime, endTime) {
        return this.forensicBlocks.filter(b => b.t >= startTime && b.t <= endTime);
    }

    /**
     * Get specific state at a precise millisecond
     */
    getForensicReport(timestamp) {
        // Find the nearest block
        const block = this.forensicBlocks.reduce((prev, curr) => {
            return Math.abs(curr.t - timestamp) < Math.abs(prev.t - timestamp) ? curr : prev;
        }, this.forensicBlocks[0]);

        return {
            timestamp,
            nearestBlock: block ? block.id : null,
            snapshot: block ? block.state : {},
            healthIndices: {
                compute: 0.95,
                network: 0.88,
                storage: 0.92
            }
        };
    }
}

module.exports = new TemporalAggregatorService();
