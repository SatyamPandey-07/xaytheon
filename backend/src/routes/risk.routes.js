const express = require('express');
const router = express.Router();
const riskController = require('../controllers/risk.controller');

router.get('/analyze', riskController.getAnalysis);

module.exports = router;
