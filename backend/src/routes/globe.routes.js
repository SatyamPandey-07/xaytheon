/**
 * Globe Routes
 * API endpoints for 3D globe visualization
 */

const express = require('express');
const router = express.Router();
const globeController = require('../controllers/globe.controller');

/**
 * GET /api/globe/statistics
 * Get current globe statistics
 */
router.get('/statistics', (req, res) => {
    globeController.getStatistics(req, res);
});

/**
 * GET /api/globe/events
 * Get buffered events
 */
router.get('/events', (req, res) => {
    globeController.getBufferedEvents(req, res);
});

/**
 * GET /api/globe/heatmap
 * Get heatmap data for globe overlay
 */
router.get('/heatmap', (req, res) => {
    globeController.getHeatmapData(req, res);
});

/**
 * GET /api/globe/regional-stats
 * Get statistics by region
 */
router.get('/regional-stats', (req, res) => {
    globeController.getRegionalStats(req, res);
});

/**
 * GET /api/globe/filters
 * Get available filter options
 */
router.get('/filters', (req, res) => {
    globeController.getAvailableFilters(req, res);
});

/**
 * POST /api/globe/simulate
 * Start event simulation for demo/testing
 */
router.post('/simulate', (req, res) => {
    globeController.simulateEvents(req, res);
});

/**
 * POST /api/globe/webhook
 * Process GitHub webhook event
 */
router.post('/webhook', (req, res) => {
    globeController.processWebhook(req, res);
});

module.exports = router;
