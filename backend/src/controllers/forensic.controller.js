/**
 * XAYTHEON - Forensic Engine Controller
 * 
 * Handles requests for historical infrastructure state,
 * time-travel queries, and temporal anomaly extraction.
 */

const temporalAggregator = require('../services/temporal-aggregator.service');
const timeSeries = require('../services/time-series.processor');

/**
 * Get the forensic timeline within a window
 * GET /api/forensic/timeline?start=timestamp&end=timestamp
 */
exports.getTimeline = async (req, res) => {
    try {
        const { start, end } = req.query;
        const startTime = parseInt(start) || (Date.now() - 300000); // Default 5 mins
        const endTime = parseInt(end) || Date.now();

        const timeline = temporalAggregator.getTimeline(startTime, endTime);

        res.json({
            success: true,
            count: timeline.length,
            window: { start: startTime, end: endTime },
            timeline
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Forensic timeline retrieval failed." });
    }
};

/**
 * Capture state at a precise millisecond
 * GET /api/forensic/snapshot/:timestamp
 */
exports.getSnapshotAtTime = async (req, res) => {
    try {
        const { timestamp } = req.params;
        const time = parseInt(timestamp);

        if (isNaN(time)) {
            return res.status(400).json({ success: false, message: "Invalid timestamp." });
        }

        const report = temporalAggregator.getForensicReport(time);

        res.json({
            success: true,
            report
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Snapshot retrieval failed." });
    }
};

/**
 * Get highly granular metrics for specific components
 * GET /api/forensic/metrics/:nodeId?start=...&end=...
 */
exports.getNodeMetrics = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const { start, end } = req.query;

        const startTime = parseInt(start);
        const endTime = parseInt(end);

        const rawData = timeSeries.getRange(nodeId, startTime, endTime);
        const compressedData = timeSeries.compress(rawData);

        res.json({
            success: true,
            nodeId,
            sampleCount: rawData.length,
            compressedCount: compressedData.length,
            data: compressedData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Node metrics retrieval failed." });
    }
};

/**
 * Simulate random forensic noise for demo/testing
 * POST /api/forensic/simulate
 */
exports.simulateTraffic = (req, res) => {
    const nodes = ['gateway', 'auth', 'user', 'payment', 'db', 'redis'];
    const now = Date.now();

    // Record 50 samples per node spanning last 5 seconds
    nodes.forEach(nodeId => {
        for (let i = 0; i < 50; i++) {
            const time = now - (i * 100);
            const val = 30 + (Math.random() * 40);
            timeSeries.record(nodeId, val, time);
        }
    });

    res.json({ success: true, message: "Simulation data injected into circular buffers." });
};
