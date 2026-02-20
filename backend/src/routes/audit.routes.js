const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');

// Run compliance audit
router.post('/run', auditController.runAudit);

// Get available frameworks
router.get('/frameworks', auditController.listFrameworks);

// Get audit history
router.get('/history', auditController.getAuditHistory);

// Get specific report
router.get('/report/:auditId', auditController.getReport);

// Download report
router.get('/report/:auditId/download', auditController.downloadReport);

module.exports = router;
