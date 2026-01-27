/**
 * Forecasting Service
 * Implements regression models for timeline prediction and milestone forecasting
 */

class ForecastingService {
    constructor() {
        this.velocityWindow = 4; // weeks
        this.confidenceThreshold = 0.7;
    }

    /**
     * Calculate team velocity based on historical data
     */
    calculateVelocity(contributions, weeks = this.velocityWindow) {
        if (!contributions || contributions.length === 0) {
            return { average: 0, trend: 'stable', confidence: 0 };
        }

        // Group contributions by week
        const weeklyData = this.groupByWeek(contributions, weeks);
        
        if (weeklyData.length < 2) {
            return { average: 0, trend: 'insufficient_data', confidence: 0 };
        }

        // Calculate metrics
        const velocities = weeklyData.map(week => week.count);
        const average = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const trend = this.calculateTrend(velocities);
        const confidence = this.calculateConfidence(velocities);

        return {
            average: Math.round(average * 100) / 100,
            trend,
            confidence,
            weeklyData,
            recentVelocity: velocities[velocities.length - 1]
        };
    }

    /**
     * Group contributions by week
     */
    groupByWeek(contributions, weeks) {
        const now = new Date();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weeklyData = [];

        for (let i = 0; i < weeks; i++) {
            const weekStart = new Date(now.getTime() - (i + 1) * weekMs);
            const weekEnd = new Date(now.getTime() - i * weekMs);

            const weekContributions = contributions.filter(c => {
                const date = new Date(c.created_at || c.timestamp);
                return date >= weekStart && date < weekEnd;
            });

            weeklyData.unshift({
                week: i + 1,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: weekEnd.toISOString().split('T')[0],
                count: weekContributions.length,
                contributors: new Set(weekContributions.map(c => c.author || c.user)).size
            });
        }

        return weeklyData;
    }

    /**
     * Calculate trend from velocity data
     */
    calculateTrend(velocities) {
        if (velocities.length < 2) return 'stable';

        // Simple linear regression
        const n = velocities.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = velocities.reduce((a, b) => a + b, 0);
        const sumXY = velocities.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        if (slope > 0.1) return 'increasing';
        if (slope < -0.1) return 'decreasing';
        return 'stable';
    }

    /**
     * Calculate confidence score
     */
    calculateConfidence(velocities) {
        if (velocities.length < 2) return 0;

        const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 1; // Coefficient of variation

        // Lower CV means higher confidence (more consistent velocity)
        return Math.max(0, Math.min(1, 1 - cv));
    }

    /**
     * Forecast milestone completion based on velocity
     */
    async forecastMilestone(milestone, currentProgress, velocity) {
        const remaining = milestone.totalTasks - currentProgress.completed;
        
        if (remaining <= 0) {
            return {
                status: 'completed',
                eta: null,
                daysRemaining: 0,
                confidence: 1
            };
        }

        if (velocity.average === 0) {
            return {
                status: 'stalled',
                eta: null,
                daysRemaining: Infinity,
                confidence: 0,
                recommendation: 'Team velocity is zero. Action required.'
            };
        }

        // Calculate ETA
        const weeksNeeded = remaining / velocity.average;
        const daysRemaining = Math.ceil(weeksNeeded * 7);
        const eta = new Date();
        eta.setDate(eta.getDate() + daysRemaining);

        // Adjust confidence based on trend
        let confidence = velocity.confidence;
        if (velocity.trend === 'decreasing') {
            confidence *= 0.8;
        } else if (velocity.trend === 'increasing') {
            confidence *= 1.1;
        }
        confidence = Math.min(1, confidence);

        // Risk assessment
        const risk = this.assessMilestoneRisk(daysRemaining, milestone.deadline, confidence);

        return {
            status: 'in_progress',
            eta: eta.toISOString(),
            daysRemaining,
            weeksNeeded: Math.round(weeksNeeded * 10) / 10,
            confidence: Math.round(confidence * 100) / 100,
            risk,
            recommendation: this.getRecommendation(risk, velocity)
        };
    }

    /**
     * Assess milestone risk
     */
    assessMilestoneRisk(daysRemaining, deadline, confidence) {
        if (!deadline) return 'unknown';

        const deadlineDate = new Date(deadline);
        const today = new Date();
        const daysToDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (daysRemaining > daysToDeadline * 1.2) return 'high';
        if (daysRemaining > daysToDeadline) return 'medium';
        if (confidence < 0.5) return 'medium';
        return 'low';
    }

    /**
     * Get recommendation based on risk
     */
    getRecommendation(risk, velocity) {
        const recommendations = {
            high: 'Consider increasing team size or reducing scope. Current velocity may not meet deadline.',
            medium: 'Monitor closely. Consider optimizing workflow or adding resources.',
            low: 'On track. Maintain current velocity.',
            unknown: 'Set a deadline to enable risk assessment.'
        };

        if (velocity.trend === 'decreasing') {
            return recommendations[risk] + ' Note: Velocity is decreasing.';
        }

        return recommendations[risk] || 'Continue monitoring project progress.';
    }

    /**
     * What-If Analysis: Adjust team size or scope
     */
    simulateScenarios(milestone, currentProgress, velocity, scenarios) {
        const results = [];

        for (const scenario of scenarios) {
            const adjustedVelocity = {
                ...velocity,
                average: velocity.average * (scenario.teamSizeMultiplier || 1)
            };

            const adjustedMilestone = {
                ...milestone,
                totalTasks: Math.ceil(milestone.totalTasks * (scenario.scopeMultiplier || 1))
            };

            const forecast = this.forecastMilestone(
                adjustedMilestone,
                currentProgress,
                adjustedVelocity
            );

            results.push({
                name: scenario.name,
                teamSize: scenario.teamSize,
                scope: scenario.scope,
                forecast: forecast
            });
        }

        return results;
    }

    /**
     * Calculate sprint burndown
     */
    calculateBurndown(sprintData) {
        const { totalTasks, completedTasks, sprintDays, daysElapsed } = sprintData;
        
        const idealBurndown = [];
        const actualBurndown = [];

        // Ideal burndown line
        for (let day = 0; day <= sprintDays; day++) {
            idealBurndown.push({
                day,
                remaining: totalTasks - (totalTasks * day / sprintDays)
            });
        }

        // Actual burndown
        const remaining = totalTasks - completedTasks.length;
        actualBurndown.push({
            day: daysElapsed,
            remaining
        });

        const velocity = completedTasks.length / daysElapsed;
        const projectedCompletion = remaining / velocity;

        return {
            idealBurndown,
            actualBurndown,
            velocity,
            projectedCompletion: Math.ceil(projectedCompletion),
            status: projectedCompletion <= (sprintDays - daysElapsed) ? 'on_track' : 'at_risk'
        };
    }

    /**
     * Analyze bottlenecks in the workflow
     */
    analyzeBottlenecks(contributions, pullRequests) {
        const bottlenecks = [];

        // PR review time analysis
        const reviewTimes = pullRequests
            .filter(pr => pr.merged_at && pr.created_at)
            .map(pr => {
                const created = new Date(pr.created_at);
                const merged = new Date(pr.merged_at);
                return (merged - created) / (1000 * 60 * 60); // hours
            });

        if (reviewTimes.length > 0) {
            const avgReviewTime = reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length;
            if (avgReviewTime > 48) {
                bottlenecks.push({
                    type: 'slow_reviews',
                    severity: 'high',
                    metric: `${Math.round(avgReviewTime)} hours average review time`,
                    recommendation: 'Consider adding more reviewers or reducing PR size'
                });
            }
        }

        // Contribution concentration
        const authorCounts = {};
        contributions.forEach(c => {
            const author = c.author || c.user;
            authorCounts[author] = (authorCounts[author] || 0) + 1;
        });

        const authors = Object.keys(authorCounts);
        if (authors.length > 0) {
            const maxContributions = Math.max(...Object.values(authorCounts));
            const totalContributions = contributions.length;
            
            if (maxContributions / totalContributions > 0.6) {
                bottlenecks.push({
                    type: 'contributor_concentration',
                    severity: 'medium',
                    metric: `${Math.round(maxContributions / totalContributions * 100)}% from single contributor`,
                    recommendation: 'High concentration risk. Encourage broader participation.'
                });
            }
        }

        // Activity gaps
        const sortedContributions = contributions
            .sort((a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp));
        
        let maxGap = 0;
        for (let i = 1; i < sortedContributions.length; i++) {
            const gap = new Date(sortedContributions[i].created_at) - 
                       new Date(sortedContributions[i-1].created_at);
            maxGap = Math.max(maxGap, gap / (1000 * 60 * 60 * 24)); // days
        }

        if (maxGap > 7) {
            bottlenecks.push({
                type: 'activity_gap',
                severity: 'medium',
                metric: `${Math.round(maxGap)} days max gap`,
                recommendation: 'Large gaps in activity detected. Ensure consistent progress.'
            });
        }

        return bottlenecks;
    }

    /**
     * Compare current sprint to historical sprints
     */
    compareToHistorical(currentSprint, historicalSprints) {
        if (!historicalSprints || historicalSprints.length === 0) {
            return { comparison: 'no_data' };
        }

        const historicalAvg = historicalSprints.reduce((sum, s) => 
            sum + s.completedTasks, 0) / historicalSprints.length;

        const percentDiff = ((currentSprint.completedTasks - historicalAvg) / historicalAvg) * 100;

        return {
            comparison: percentDiff > 10 ? 'above_average' : 
                       percentDiff < -10 ? 'below_average' : 'average',
            percentDifference: Math.round(percentDiff),
            historicalAverage: Math.round(historicalAvg),
            current: currentSprint.completedTasks,
            insight: this.getHistoricalInsight(percentDiff)
        };
    }

    /**
     * Get insight from historical comparison
     */
    getHistoricalInsight(percentDiff) {
        if (percentDiff > 20) {
            return 'Excellent! Team is performing significantly above historical average.';
        } else if (percentDiff > 10) {
            return 'Good progress. Team is performing above average.';
        } else if (percentDiff < -20) {
            return 'Concerning. Performance is significantly below historical average. Investigate blockers.';
        } else if (percentDiff < -10) {
            return 'Below average performance. Consider reviewing team capacity and blockers.';
        }
        return 'Performance is consistent with historical average.';
    }
}

module.exports = new ForecastingService();
