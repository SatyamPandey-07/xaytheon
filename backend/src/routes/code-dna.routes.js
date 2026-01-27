/**
 * Code DNA Routes
 * API endpoints for structural code duplication detection
 */

const express = require('express');
const router = express.Router();
const codeDNAController = require('../controllers/code-dna.controller');

// Single repository analysis
router.post('/analyze', codeDNAController.analyzeRepository);

// Code snippet analysis
router.post('/snippet/analyze', codeDNAController.analyzeSnippet);
router.post('/snippet/compare', codeDNAController.compareSnippets);

// Cross-repository analysis
router.post('/cross-repo/index', codeDNAController.indexRepositories);
router.post('/cross-repo/duplicates', codeDNAController.findCrossRepoDuplicates);
router.get('/cross-repo/similarity-map', codeDNAController.getSimilarityMap);

// Pattern analysis
router.get('/patterns/reinvention', codeDNAController.analyzeReinventionPatterns);

// Library extraction
router.post('/extract/suggestions', codeDNAController.getLibraryExtractions);
router.post('/extract/plan', codeDNAController.getExtractionPlan);

// Comprehensive report
router.post('/report', codeDNAController.generateReport);

module.exports = router;
