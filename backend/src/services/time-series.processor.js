/**
 * XAYTHEON - High-Frequency Time-Series Processor
 * 
 * An optimized engine for storing and querying sub-second resolution 
 * infrastructure metrics. Uses delta-encoding and circular buffers 
 * for memory efficiency.
 */

class TimeSeriesProcessor {
    constructor() {
        // Circular buffers for metrics: nodeId -> Array of { timestamp, value }
        this.buffers = new Map();
        this.MAX_SAMPLES = 10000; // Keep last 10k samples per node
        this.RESOLUTION_MS = 100; // 100ms resolution
    }

    /**
     * Ingest a high-frequency sample
     */
    record(nodeId, value, timestamp = Date.now()) {
        if (!this.buffers.has(nodeId)) {
            this.buffers.set(nodeId, []);
        }

        const buffer = this.buffers.get(nodeId);
        buffer.push({ t: timestamp, v: value });

        // Maintain circular buffer size
        if (buffer.length > this.MAX_SAMPLES) {
            buffer.shift();
        }
    }

    /**
     * Retrieve a window of metrics for a node
     */
    getRange(nodeId, startTime, endTime) {
        const buffer = this.buffers.get(nodeId);
        if (!buffer) return [];

        return buffer.filter(sample => sample.t >= startTime && sample.t <= endTime);
    }

    /**
     * Compress historical data using Douglas-Peucker or simple delta-threshold
     */
    compress(data, threshold = 0.5) {
        if (data.length <= 2) return data;

        const results = [data[0]];
        let lastKept = data[0];

        for (let i = 1; i < data.length - 1; i++) {
            const current = data[i];
            const diff = Math.abs(current.v - lastKept.v);

            if (diff > threshold) {
                results.push(current);
                lastKept = current;
            }
        }

        results.push(data[data.length - 1]);
        return results;
    }

    /**
     * Get snapshot of all nodes at a specific millisecond
     */
    getGlobalSnapshot(timestamp) {
        const snapshot = {};
        this.buffers.forEach((buffer, nodeId) => {
            // Find closest sample before or at timestamp
            const sample = buffer.reduce((prev, curr) => {
                if (curr.t <= timestamp && (!prev || curr.t > prev.t)) {
                    return curr;
                }
                return prev;
            }, null);

            if (sample) snapshot[nodeId] = sample.v;
        });
        return snapshot;
    }

    getStats() {
        return {
            nodesTracked: this.buffers.size,
            totalSamples: Array.from(this.buffers.values()).reduce((sum, b) => sum + b.length, 0),
            resolution: `${this.RESOLUTION_MS}ms`
        };
    }
}

module.exports = new TimeSeriesProcessor();
