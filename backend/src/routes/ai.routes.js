const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');

router.post('/chat', aiController.chat);
router.get('/summarize', aiController.summarize);

// Self-Healing CI/CD Routes
router.get('/remediation/:buildId', aiController.getRemediation);
router.post('/remediation/:buildId/apply', aiController.applyPatch);
router.post('/simulate-failure', aiController.simulateBuildFailure);

module.exports = router;
