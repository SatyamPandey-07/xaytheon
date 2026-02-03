/**
 * Security Fuzzer Routes
 * API endpoints for vulnerability analysis and exploit path tracing
 */

const express = require('express');
const router = express.Router();
const securityFuzzerController = require('../controllers/security-fuzzer.controller');

// Taint analysis
router.post('/taint/analyze', securityFuzzerController.analyzeTaintFlows);

// Vulnerability path tracing
router.post('/paths/trace', securityFuzzerController.traceExploitPaths);

// Security test generation
router.post('/tests/generate', securityFuzzerController.generateSecurityTests);
router.post('/tests/download', securityFuzzerController.downloadTestFile);

// CVE impact scoring
router.post('/cve/score', securityFuzzerController.scoreCVE);
router.post('/cve/score-multiple', securityFuzzerController.scoreMultipleCVEs);
router.post('/cve/risk-matrix', securityFuzzerController.getRiskMatrix);

// Comprehensive analysis
router.post('/analyze', securityFuzzerController.analyzeProject);

// 3D visualization
router.post('/visualization', securityFuzzerController.getVisualizationData);

module.exports = router;
