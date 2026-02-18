/**
 * XAYTHEON - Security Routes
 * 
 * API endpoints for AI security analysis and automated fuzzing.
 */

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');

// Run predictive analysis
router.post('/analyze', securityController.runAnalysis);

// Trigger fuzzing scan
router.post('/fuzz', securityController.triggerFuzz);

// Retrieve threat history
router.get('/threats', securityController.getHistory);

// Get security dashboard status
router.get('/status', securityController.getStatus);

module.exports = router;
