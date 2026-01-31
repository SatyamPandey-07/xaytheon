const express = require('express');
const router = express.Router();
const bundleController = require('../controllers/bundle.controller');

router.get('/city', bundleController.getBundleCity);
router.post('/demolish', bundleController.pruneBuilding);

module.exports = router;
