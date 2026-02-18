const express = require('express');
const rateLimit = require('express-rate-limit');
const searchController = require('../controllers/search.controller');

const router = express.Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

// Semantic Discovery Endpoints
router.get('/smart', searchLimiter, searchController.smartSearch);
router.get('/relationships/:nodeId', searchLimiter, searchController.getNodeRelationships);
router.get('/graph-stats', searchLimiter, searchController.getStats);

module.exports = router;
