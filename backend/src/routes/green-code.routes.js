const express = require("express");
const router = express.Router();
const greenCodeController = require("../controllers/green-code.controller");

/**
 * Green Code Optimizer Routes
 */

// Complexity Analysis
router.get("/complexity/:owner/:repo", greenCodeController.analyzeComplexity);

// Carbon Footprint
router.get("/footprint/:owner/:repo", greenCodeController.calculateFootprint);

// Region Comparison
router.get("/regions/compare", greenCodeController.compareRegions);
router.get("/regions/categories", greenCodeController.getRegionsByCategory);

// Green Refactors
router.get("/refactors/:owner/:repo", greenCodeController.generateRefactors);
router.get("/plan/:owner/:repo", greenCodeController.generatePlan);

// Sustainability Rating (Eco-Badge)
router.get("/rating/:owner/:repo", greenCodeController.generateRating);
router.get("/history/:owner/:repo", greenCodeController.getHistoricalRatings);
router.get("/compare-peers/:owner/:repo", greenCodeController.compareWithPeers);

// Optimization Savings
router.get("/savings/:owner/:repo", greenCodeController.calculateSavings);

// Comprehensive Analysis (all-in-one)
router.get("/analyze/:owner/:repo", greenCodeController.getComprehensiveAnalysis);

// Cache Management
router.post("/clear-cache", greenCodeController.clearCaches);

module.exports = router;
