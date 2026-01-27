/**
 * DevOps War-Room API Controller
 */

const eventStreamService = require('../services/event-stream.service');
const incidentService = require('../services/incident.service');
const aiRootCauseService = require('../services/ai-root-cause.service');

class WarRoomController {
    /**
     * Get all events
     */
    async getEvents(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const events = eventStreamService.getEvents(limit);
            
            res.json({
                success: true,
                count: events.length,
                events
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get event statistics
     */
    async getEventStats(req, res) {
        try {
            const stats = eventStreamService.getStatistics();
            
            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Fetch GitHub Actions events
     */
    async fetchGitHubActions(req, res) {
        try {
            const { owner, repo } = req.body;
            
            if (!owner || !repo) {
                return res.status(400).json({
                    success: false,
                    error: 'Owner and repo are required'
                });
            }

            const events = await eventStreamService.fetchGitHubActions(owner, repo);
            
            res.json({
                success: true,
                count: events.length,
                events
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Simulate deployment failure
     */
    async simulateDeploymentFailure(req, res) {
        try {
            const event = eventStreamService.simulateDeploymentFailure();
            
            res.json({
                success: true,
                event
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Simulate production error
     */
    async simulateProductionError(req, res) {
        try {
            const event = eventStreamService.simulateProductionError();
            
            res.json({
                success: true,
                event
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get all incidents
     */
    async getIncidents(req, res) {
        try {
            const filter = {
                status: req.query.status,
                severity: req.query.severity,
                repository: req.query.repository
            };

            const incidents = incidentService.getAllIncidents(filter);
            
            res.json({
                success: true,
                count: incidents.length,
                incidents
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get incident by ID
     */
    async getIncident(req, res) {
        try {
            const { id } = req.params;
            const incident = incidentService.getIncident(id);

            if (!incident) {
                return res.status(404).json({
                    success: false,
                    error: 'Incident not found'
                });
            }

            res.json({
                success: true,
                incident
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Create incident
     */
    async createIncident(req, res) {
        try {
            const { event, userId } = req.body;

            if (!event) {
                return res.status(400).json({
                    success: false,
                    error: 'Event data is required'
                });
            }

            const incident = incidentService.createIncident(event, userId || 'anonymous');

            // Perform AI analysis
            const analysis = await aiRootCauseService.analyzeIncident(incident);
            incidentService.setRootCause(
                incident.id,
                analysis.rootCause,
                analysis.hypothesis,
                analysis.suggestedActions
            );

            res.json({
                success: true,
                incident,
                analysis
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update incident status
     */
    async updateIncidentStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, userId, notes } = req.body;

            const incident = incidentService.updateStatus(id, status, userId, notes);

            res.json({
                success: true,
                incident
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Assign incident
     */
    async assignIncident(req, res) {
        try {
            const { id } = req.params;
            const { userIds, assignedBy } = req.body;

            const incident = incidentService.assignIncident(id, userIds, assignedBy);

            res.json({
                success: true,
                incident
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Add comment to incident
     */
    async addComment(req, res) {
        try {
            const { id } = req.params;
            const { userId, comment } = req.body;

            const incident = incidentService.addComment(id, userId, comment);

            res.json({
                success: true,
                incident
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get AI analysis for incident
     */
    async analyzeIncident(req, res) {
        try {
            const { id } = req.params;
            const incident = incidentService.getIncident(id);

            if (!incident) {
                return res.status(404).json({
                    success: false,
                    error: 'Incident not found'
                });
            }

            const analysis = await aiRootCauseService.analyzeIncident(incident);
            const remediationPlan = aiRootCauseService.generateRemediationPlan(analysis);

            res.json({
                success: true,
                analysis,
                remediationPlan
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get incident statistics
     */
    async getIncidentStats(req, res) {
        try {
            const timeWindow = parseInt(req.query.timeWindow) || 86400000; // 24 hours
            const stats = incidentService.getStatistics(timeWindow);

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get pinned incident
     */
    async getPinnedIncident(req, res) {
        try {
            const incident = incidentService.getPinnedIncident();

            res.json({
                success: true,
                incident
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new WarRoomController();
