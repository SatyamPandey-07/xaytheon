const express = require('express');
const router = express.Router();
const riskController = require('../controllers/risk.controller');

router.get('/analyze', riskController.getAnalysis);
router.get('/galaxy', riskController.getRiskGalaxy);
router.get('/predict/:fileId', riskController.getPredictiveAnalysis);

module.exports = router;
