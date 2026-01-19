const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

router.get('/summary', healthController.getHealthSummary);
router.post('/mock-trigger', healthController.triggerMockUpdate);

module.exports = router;
