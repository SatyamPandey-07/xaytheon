/**
 * Fleet Routes
 * Routes for multi-repository fleet dashboard
 */

const express = require('express');
const router = express.Router();
const fleetController = require('../controllers/fleet.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyAccessToken);

/**
 * @route   POST /api/fleet/analyze
 * @desc    Analyze multiple repositories and provide fleet-wide insights
 * @access  Private
 */
router.post('/analyze', fleetController.analyzeFleet);

/**
 * @route   POST /api/fleet/compare
 * @desc    Compare repositories side-by-side
 * @access  Private
 */
router.post('/compare', fleetController.compareRepositories);

/**
 * @route   GET /api/fleet/health/:score
 * @desc    Get organization health score interpretation
 * @access  Private
 */
router.get('/health/:score', fleetController.getHealthInterpretation);

/**
 * @route   GET /api/fleet/templates
 * @desc    Get predefined fleet templates
 * @access  Private
 */
router.get('/templates', fleetController.getTemplates);

/**
 * Fleet Configuration Management
 */
router.get('/configs', fleetController.getFleetConfigs);
router.get('/config/:id', fleetController.getFleetConfig);
router.put('/config/:id', fleetController.updateFleetConfig);
router.delete('/config/:id', fleetController.deleteFleetConfig);

/**
 * Fleet Analytics and Alerts
 */
router.get('/analytics/:configId', fleetController.getFleetAnalytics);
router.get('/alerts/:configId', fleetController.getFleetAlerts);
router.post('/alerts/:alertId/resolve', fleetController.resolveFleetAlert);

module.exports = router;