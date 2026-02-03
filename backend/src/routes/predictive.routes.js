/**
 * Predictive Analytics Routes
 * API endpoints for forecasting, velocity tracking, and burnout detection
 */

const express = require('express');
const router = express.Router();
const predictiveController = require('../controllers/predictive.controller');

// Velocity tracking
router.get('/velocity', predictiveController.getVelocity);

// Milestone forecasting
router.post('/forecast/milestone', predictiveController.forecastMilestone);

// What-if scenario simulation
router.post('/simulate', predictiveController.simulateScenario);

// Bottleneck analysis
router.get('/bottlenecks', predictiveController.analyzeBottlenecks);

// Sprint burndown
router.get('/burndown', predictiveController.getBurndown);

// Burnout detection
router.post('/burnout', predictiveController.detectBurnout);

// Sentiment analysis
router.post('/sentiment', predictiveController.analyzeSentiment);

// Project health overview
router.get('/health', predictiveController.getProjectHealth);

// Historical comparison
router.post('/compare', predictiveController.compareHistorical);

module.exports = router;
