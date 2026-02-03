/**
 * Knowledge Map API Routes
 */

const express = require('express');
const router = express.Router();
const knowledgeMapController = require('../controllers/knowledge-map.controller');

// Knowledge Graph
router.get('/graph/:owner/:repo', knowledgeMapController.getKnowledgeGraph);
router.get('/visualization/3d/:owner/:repo', knowledgeMapController.get3DVisualization);

// Silos & Bus Factor
router.get('/silos/:owner/:repo', knowledgeMapController.getSilos);
router.get('/bus-factor/:owner/:repo', knowledgeMapController.getBusFactor);
router.get('/isolation-scores/:owner/:repo', knowledgeMapController.getIsolationScores);
router.get('/silo-reduction-plan/:owner/:repo', knowledgeMapController.getSiloReductionPlan);

// Expertise
router.get('/expertise/:owner/:repo', knowledgeMapController.getTeamExpertise);
router.get('/expertise/:owner/:repo/:username', knowledgeMapController.getDeveloperExpertise);
router.get('/tech-coverage/:owner/:repo', knowledgeMapController.getTechCoverage);
router.get('/experts/:owner/:repo/:technology', knowledgeMapController.findExperts);

// Pair Programming
router.post('/pair-recommendations/:owner/:repo', knowledgeMapController.getPairRecommendations);
router.get('/general-pairings/:owner/:repo', knowledgeMapController.getGeneralPairings);

// Knowledge Overlap
router.get('/overlap/:owner/:repo/:dev1/:dev2', knowledgeMapController.getKnowledgeOverlap);

// Utilities
router.post('/clear-cache', knowledgeMapController.clearCaches);

module.exports = router;
