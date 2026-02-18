/**
 * XAYTHEON - Load Balancer & Traffic Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/load-balancer.controller');

router.get('/status', controller.getStatus);
router.post('/simulate-failure', controller.simulateFailure);
router.post('/resolve', controller.resolveTarget);

module.exports = router;
