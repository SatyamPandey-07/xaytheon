/**
 * DevOps War-Room API Routes
 */

const express = require('express');
const router = express.Router();
const warRoomController = require('../controllers/war-room.controller');

// Event Stream Routes
router.get('/events', warRoomController.getEvents);
router.get('/events/stats', warRoomController.getEventStats);
router.post('/events/github-actions', warRoomController.fetchGitHubActions);

// Simulation Routes
router.post('/simulate/deployment-failure', warRoomController.simulateDeploymentFailure);
router.post('/simulate/production-error', warRoomController.simulateProductionError);

// Incident Routes
router.get('/incidents', warRoomController.getIncidents);
router.get('/incidents/stats', warRoomController.getIncidentStats);
router.get('/incidents/pinned', warRoomController.getPinnedIncident);
router.get('/incidents/:id', warRoomController.getIncident);
router.post('/incidents', warRoomController.createIncident);
router.patch('/incidents/:id/status', warRoomController.updateIncidentStatus);
router.patch('/incidents/:id/assign', warRoomController.assignIncident);
router.post('/incidents/:id/comments', warRoomController.addComment);
router.get('/incidents/:id/analyze', warRoomController.analyzeIncident);

module.exports = router;
