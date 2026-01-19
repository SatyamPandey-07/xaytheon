/**
 * Fleet Controller
 * Handles fleet dashboard API endpoints
 */

const fleetService = require('../services/fleet-manager.service');
const fleetModel = require('../models/fleet.model');

/**
 * POST /api/fleet/analyze
 * Analyze multiple repositories and provide fleet-wide insights
 */
exports.analyzeFleet = async (req, res) => {
    try {
        const { repositories, configName } = req.body;
        const userId = req.userId;

        if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
            return res.status(400).json({
                message: "Repositories array is required with at least one repository"
            });
        }

        // Validate repository format
        const invalidRepos = repositories.filter(repo => 
            !repo.owner || !repo.name || typeof repo.owner !== 'string' || typeof repo.name !== 'string'
        );

        if (invalidRepos.length > 0) {
            return res.status(400).json({
                message: "Each repository must have valid 'owner' and 'name' fields"
            });
        }

        const analysis = await fleetService.aggregateFleetMetrics(repositories, userId);
        
        // Save fleet configuration if name is provided
        let configId = null;
        if (configName) {
            configId = await fleetModel.createFleetConfig(
                userId,
                configName,
                `Fleet configuration for ${configName}`,
                repositories
            );
        }
        
        // Save analytics snapshot if config was created
        if (configId) {
            await fleetModel.createFleetAnalytics(
                configId,
                analysis,
                analysis.healthScore,
                {
                    totalRepositories: analysis.fleetSummary.totalRepositories,
                    totalStars: analysis.fleetSummary.totalStars,
                    totalContributors: analysis.fleetSummary.totalContributors,
                    totalCommits: analysis.fleetSummary.totalCommits
                }
            );
        }
        
        res.json({
            success: true,
            data: analysis,
            configId: configId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Fleet analysis error:", error);
        res.status(500).json({
            message: "Failed to analyze fleet",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * POST /api/fleet/compare
 * Compare repositories side-by-side
 */
exports.compareRepositories = async (req, res) => {
    try {
        const { repositories } = req.body;

        if (!repositories || !Array.isArray(repositories) || repositories.length < 2) {
            return res.status(400).json({
                message: "At least 2 repositories required for comparison"
            });
        }

        const comparison = await fleetService.compareRepositories(repositories);
        
        res.json({
            success: true,
            data: comparison,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Repository comparison error:", error);
        res.status(500).json({
            message: "Failed to compare repositories",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/fleet/health/:score
 * Get organization health score interpretation
 */
exports.getHealthInterpretation = async (req, res) => {
    try {
        const { score } = req.params;
        const numericScore = parseInt(score);

        if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
            return res.status(400).json({
                message: "Score must be a number between 0 and 100"
            });
        }

        const interpretation = {
            score: numericScore,
            level: numericScore >= 80 ? 'Excellent' : 
                   numericScore >= 60 ? 'Good' : 
                   numericScore >= 40 ? 'Fair' : 'Poor',
            color: numericScore >= 80 ? '#10b981' : 
                   numericScore >= 60 ? '#f59e0b' : 
                   numericScore >= 40 ? '#f97316' : '#ef4444',
            description: this.getHealthDescription(numericScore),
            recommendations: this.getHealthRecommendations(numericScore)
        };

        res.json({
            success: true,
            data: interpretation
        });
    } catch (error) {
        console.error("Health interpretation error:", error);
        res.status(500).json({
            message: "Failed to get health interpretation"
        });
    }
};

/**
 * GET /api/fleet/templates
 * Get predefined fleet templates for common use cases
 */
exports.getTemplates = async (req, res) => {
    try {
        const templates = [
            {
                id: 'startup-tech-stack',
                name: 'Startup Tech Stack',
                description: 'Monitor your core technology repositories',
                repositories: [
                    { owner: 'your-org', name: 'frontend-app' },
                    { owner: 'your-org', name: 'backend-api' },
                    { owner: 'your-org', name: 'mobile-app' },
                    { owner: 'your-org', name: 'infrastructure' }
                ]
            },
            {
                id: 'microservices-suite',
                name: 'Microservices Suite',
                description: 'Analyze your microservice architecture',
                repositories: [
                    { owner: 'your-org', name: 'user-service' },
                    { owner: 'your-org', name: 'order-service' },
                    { owner: 'your-org', name: 'payment-service' },
                    { owner: 'your-org', name: 'notification-service' },
                    { owner: 'your-org', name: 'gateway-service' }
                ]
            },
            {
                id: 'oss-projects',
                name: 'Open Source Projects',
                description: 'Track your open source contributions',
                repositories: [
                    { owner: 'your-org', name: 'library-one' },
                    { owner: 'your-org', name: 'tool-two' },
                    { owner: 'your-org', name: 'framework-three' }
                ]
            }
        ];

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error("Templates error:", error);
        res.status(500).json({
            message: "Failed to fetch templates"
        });
    }
};

/**
 * GET /api/fleet/configs
 * Get all fleet configurations for the authenticated user
 */
exports.getFleetConfigs = async (req, res) => {
    try {
        const userId = req.userId;
        
        const configs = await fleetModel.getFleetConfigs(userId);
        
        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        console.error("Get fleet configs error:", error);
        res.status(500).json({
            message: "Failed to fetch fleet configurations",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/fleet/config/:id
 * Get a specific fleet configuration
 */
exports.getFleetConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const config = await fleetModel.getFleetConfigById(id, userId);
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error("Get fleet config error:", error);
        res.status(error.message === 'Fleet configuration not found' ? 404 : 500).json({
            message: error.message || "Failed to fetch fleet configuration",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * PUT /api/fleet/config/:id
 * Update a fleet configuration
 */
exports.updateFleetConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, repositories } = req.body;
        const userId = req.userId;
        
        if (!name || !repositories || !Array.isArray(repositories)) {
            return res.status(400).json({
                message: "Name and repositories array are required"
            });
        }
        
        const configId = await fleetModel.updateFleetConfig(id, userId, name, description, repositories);
        
        res.json({
            success: true,
            message: "Fleet configuration updated successfully",
            configId
        });
    } catch (error) {
        console.error("Update fleet config error:", error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            message: error.message || "Failed to update fleet configuration",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * DELETE /api/fleet/config/:id
 * Delete a fleet configuration
 */
exports.deleteFleetConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        await fleetModel.deleteFleetConfig(id, userId);
        
        res.json({
            success: true,
            message: "Fleet configuration deleted successfully"
        });
    } catch (error) {
        console.error("Delete fleet config error:", error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            message: error.message || "Failed to delete fleet configuration",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/fleet/analytics/:configId
 * Get analytics for a specific fleet configuration
 */
exports.getFleetAnalytics = async (req, res) => {
    try {
        const { configId } = req.params;
        
        const analytics = await fleetModel.getFleetAnalytics(configId);
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error("Get fleet analytics error:", error);
        res.status(500).json({
            message: "Failed to fetch fleet analytics",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * GET /api/fleet/alerts/:configId
 * Get unresolved alerts for a fleet configuration
 */
exports.getFleetAlerts = async (req, res) => {
    try {
        const { configId } = req.params;
        
        const alerts = await fleetModel.getUnresolvedFleetAlerts(configId);
        
        res.json({
            success: true,
            data: alerts
        });
    } catch (error) {
        console.error("Get fleet alerts error:", error);
        res.status(500).json({
            message: "Failed to fetch fleet alerts",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * POST /api/fleet/alerts/:alertId/resolve
 * Resolve a fleet alert
 */
exports.resolveFleetAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const { configId } = req.body; // Pass configId in request body for authorization
        
        await fleetModel.resolveFleetAlert(alertId, configId);
        
        res.json({
            success: true,
            message: "Alert resolved successfully"
        });
    } catch (error) {
        console.error("Resolve fleet alert error:", error);
        res.status(500).json({
            message: "Failed to resolve fleet alert",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper methods
exports.getHealthDescription = (score) => {
    if (score >= 80) {
        return "Your organization demonstrates excellent DevOps maturity with strong practices across all repositories.";
    } else if (score >= 60) {
        return "Your organization shows good practices but has room for improvement in certain areas.";
    } else if (score >= 40) {
        return "Your organization has fair DevOps practices but needs significant improvements.";
    } else {
        return "Your organization requires immediate attention to improve DevOps practices and repository health.";
    }
};

exports.getHealthRecommendations = (score) => {
    if (score >= 80) {
        return [
            "Continue maintaining high standards",
            "Share best practices across teams",
            "Consider mentoring other organizations",
            "Explore advanced DevOps practices"
        ];
    } else if (score >= 60) {
        return [
            "Standardize development practices across repositories",
            "Improve automated testing coverage",
            "Enhance monitoring and observability",
            "Reduce technical debt in lower-performing repos"
        ];
    } else if (score >= 40) {
        return [
            "Establish basic CI/CD pipelines",
            "Implement code review processes",
            "Set up monitoring for critical repositories",
            "Address high-priority technical debt"
        ];
    } else {
        return [
            "Establish fundamental DevOps practices immediately",
            "Create basic repository hygiene standards",
            "Implement essential monitoring",
            "Prioritize critical repository maintenance"
        ];
    }
};