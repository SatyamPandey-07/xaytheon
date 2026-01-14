const express = require('express');
const router = express.Router();
const compareController = require('../controllers/compare.controller');

router.get('/', compareController.compareRepos);
router.get('/trending', compareController.getTrendingForComparison);

module.exports = router;
