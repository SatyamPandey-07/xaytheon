const express = require('express');
const router = express.Router();
const testController = require('../controllers/test-lab.controller');

router.get('/analyze', testController.analyzeCode);
router.post('/generate', testController.generateTests);

module.exports = router;
