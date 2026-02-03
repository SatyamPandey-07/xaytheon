/**
 * Predictive Analytics Controller
 * Handles forecasting, velocity tracking, and burnout detection
 */

const forecastingService = require('../services/forecasting.service');
const sentimentEngine = require('../services/sentiment-trend.engine');

class PredictiveController {
    /**
     * Get team velocity metrics
     */
    async getVelocity(req, res) {
        try {
            const { repo, owner, timeWindow = 4 } = req.query;

            if (!repo || !owner) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner'
                });
            }

            const velocity = await forecastingService.calculateVelocity(
                owner,
                repo,
                parseInt(timeWindow)
            );

            res.json({
                success: true,
                data: velocity
            });
        } catch (error) {
            console.error('Error getting velocity:', error);
            res.status(500).json({
                error: 'Failed to calculate velocity',
                message: error.message
            });
        }
    }

    /**
     * Forecast milestone completion
     */
    async forecastMilestone(req, res) {
        try {
            const { repo, owner, milestone, remainingIssues, remainingPoints } = req.body;

            if (!repo || !owner || !milestone) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner, milestone'
                });
            }

            const forecast = await forecastingService.forecastMilestone(
                owner,
                repo,
                milestone,
                remainingIssues,
                remainingPoints
            );

            res.json({
                success: true,
                data: forecast
            });
        } catch (error) {
            console.error('Error forecasting milestone:', error);
            res.status(500).json({
                error: 'Failed to forecast milestone',
                message: error.message
            });
        }
    }

    /**
     * Run what-if scenario simulation
     */
    async simulateScenario(req, res) {
        try {
            const { repo, owner, scenarios } = req.body;

            if (!repo || !owner || !scenarios || !Array.isArray(scenarios)) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner, scenarios (array)'
                });
            }

            const results = [];

            for (const scenario of scenarios) {
                const result = await forecastingService.simulateScenarios(
                    owner,
                    repo,
                    scenario
                );
                results.push(result);
            }

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            console.error('Error simulating scenarios:', error);
            res.status(500).json({
                error: 'Failed to simulate scenarios',
                message: error.message
            });
        }
    }

    /**
     * Analyze workflow bottlenecks
     */
    async analyzeBottlenecks(req, res) {
        try {
            const { repo, owner, timeWindow = 30 } = req.query;

            if (!repo || !owner) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner'
                });
            }

            const bottlenecks = await forecastingService.analyzeBottlenecks(
                owner,
                repo,
                parseInt(timeWindow)
            );

            res.json({
                success: true,
                data: bottlenecks
            });
        } catch (error) {
            console.error('Error analyzing bottlenecks:', error);
            res.status(500).json({
                error: 'Failed to analyze bottlenecks',
                message: error.message
            });
        }
    }

    /**
     * Get sprint burndown data
     */
    async getBurndown(req, res) {
        try {
            const { repo, owner, sprintStart, sprintEnd, totalPoints } = req.query;

            if (!repo || !owner || !sprintStart || !sprintEnd) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner, sprintStart, sprintEnd'
                });
            }

            const burndown = await forecastingService.calculateBurndown(
                owner,
                repo,
                new Date(sprintStart),
                new Date(sprintEnd),
                parseInt(totalPoints)
            );

            res.json({
                success: true,
                data: burndown
            });
        } catch (error) {
            console.error('Error calculating burndown:', error);
            res.status(500).json({
                error: 'Failed to calculate burndown',
                message: error.message
            });
        }
    }

    /**
     * Detect burnout risk for team
     */
    async detectBurnout(req, res) {
        try {
            const { repo, owner, timeWindow = 30 } = req.query;

            if (!repo || !owner) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner'
                });
            }

            // This would need integration with GitHub API to fetch actual data
            // For now, using placeholder structure
            const activities = req.body.activities || [];
            const sentiments = req.body.sentiments || [];
            const developers = req.body.developers || [];

            if (developers.length === 0) {
                return res.status(400).json({
                    error: 'No developers provided for analysis'
                });
            }

            const heatmap = await sentimentEngine.generateBurnoutHeatmap(
                developers,
                activities,
                sentiments
            );

            res.json({
                success: true,
                data: heatmap
            });
        } catch (error) {
            console.error('Error detecting burnout:', error);
            res.status(500).json({
                error: 'Failed to detect burnout',
                message: error.message
            });
        }
    }

    /**
     * Analyze sentiment trends
     */
    async analyzeSentiment(req, res) {
        try {
            const { repo, owner, type = 'pr', timeWindow = 30 } = req.query;

            if (!repo || !owner) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner'
                });
            }

            let analysis;

            if (type === 'pr') {
                const pullRequests = req.body.pullRequests || [];
                analysis = await sentimentEngine.analyzePRComments(pullRequests);
            } else if (type === 'commits') {
                const commits = req.body.commits || [];
                analysis = sentimentEngine.analyzeCommits(commits);
            } else {
                return res.status(400).json({
                    error: 'Invalid type. Must be "pr" or "commits"'
                });
            }

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            res.status(500).json({
                error: 'Failed to analyze sentiment',
                message: error.message
            });
        }
    }

    /**
     * Get comprehensive project health
     */
    async getProjectHealth(req, res) {
        try {
            const { repo, owner, timeWindow = 30 } = req.query;

            if (!repo || !owner) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner'
                });
            }

            // Gather all metrics in parallel
            const [velocity, bottlenecks] = await Promise.all([
                forecastingService.calculateVelocity(owner, repo, 4),
                forecastingService.analyzeBottlenecks(owner, repo, parseInt(timeWindow))
            ]);

            const health = {
                velocity: {
                    current: velocity.current,
                    trend: velocity.trend,
                    confidence: velocity.confidence
                },
                bottlenecks: {
                    count: Object.keys(bottlenecks).length,
                    critical: bottlenecks.slowReviews?.severity === 'high' ||
                             bottlenecks.concentrationRisk?.severity === 'high',
                    details: bottlenecks
                },
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                data: health
            });
        } catch (error) {
            console.error('Error getting project health:', error);
            res.status(500).json({
                error: 'Failed to get project health',
                message: error.message
            });
        }
    }

    /**
     * Compare historical performance
     */
    async compareHistorical(req, res) {
        try {
            const { repo, owner, periods } = req.body;

            if (!repo || !owner || !periods || !Array.isArray(periods)) {
                return res.status(400).json({
                    error: 'Missing required parameters: repo, owner, periods (array)'
                });
            }

            const comparison = await forecastingService.compareHistoricalPerformance(
                owner,
                repo,
                periods
            );

            res.json({
                success: true,
                data: comparison
            });
        } catch (error) {
            console.error('Error comparing historical data:', error);
            res.status(500).json({
                error: 'Failed to compare historical performance',
                message: error.message
            });
        }
    }
}

module.exports = new PredictiveController();
