const express = require("express");
const router = express.Router();
const searchController = require("../controllers/search.controller");
const { authenticateToken, optionalAuthenticate } = require("../middleware/auth.middleware");

// Public search with optional auth for personalization
router.get("/", optionalAuthenticate, searchController.search);

// Global autocomplete suggestions
router.get("/suggestions", searchController.getSuggestions);

// Trending searches
router.get("/trending", searchController.getTrending);

// User history (requires authentication)
router.get("/history", authenticateToken, searchController.getHistory);
router.delete("/history", authenticateToken, searchController.clearHistory);

module.exports = router;
