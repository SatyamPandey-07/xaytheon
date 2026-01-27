/**
 * Sentiment Trend Engine
 * Analyzes emotional tone shifts in developer communications
 * Detects burnout risk through sentiment and activity patterns
 */

const Sentiment = require('sentiment');

class SentimentTrendEngine {
    constructor() {
        this.sentiment = new Sentiment();
        this.burnoutThresholds = {
            highActivityLowSentiment: { activity: 50, sentiment: -0.3 },
            sustainedNegative: { duration: 14, sentiment: -0.2 },
            drasticDrop: { change: -0.5, window: 7 }
        };
    }

    /**
     * Analyze sentiment from text content
     */
    analyzeSentiment(text) {
        if (!text || typeof text !== 'string') {
            return { score: 0, comparative: 0, tokens: [], positive: [], negative: [] };
        }

        return this.sentiment.analyze(text);
    }

    /**
     * Analyze PR comments for sentiment trends
     */
    async analyzePRComments(pullRequests) {
        const results = [];

        for (const pr of pullRequests) {
            const comments = pr.comments || [];
            const reviewComments = pr.review_comments || [];
            const allComments = [...comments, ...reviewComments];

            if (allComments.length === 0) {
                continue;
            }

            const sentiments = allComments.map(comment => {
                const analysis = this.analyzeSentiment(comment.body);
                return {
                    author: comment.user?.login || 'unknown',
                    timestamp: comment.created_at,
                    score: analysis.score,
                    comparative: analysis.comparative,
                    positive: analysis.positive,
                    negative: analysis.negative
                };
            });

            const avgSentiment = sentiments.reduce((sum, s) => sum + s.comparative, 0) / sentiments.length;

            results.push({
                prNumber: pr.number,
                prTitle: pr.title,
                author: pr.user?.login,
                createdAt: pr.created_at,
                commentCount: allComments.length,
                avgSentiment: Math.round(avgSentiment * 1000) / 1000,
                sentiments
            });
        }

        return results;
    }

    /**
     * Analyze commit messages for sentiment
     */
    analyzeCommits(commits) {
        const results = commits.map(commit => {
            const message = commit.commit?.message || commit.message || '';
            const analysis = this.analyzeSentiment(message);

            return {
                sha: commit.sha,
                author: commit.commit?.author?.name || commit.author,
                timestamp: commit.commit?.author?.date || commit.timestamp,
                message: message.split('\n')[0], // First line only
                sentiment: {
                    score: analysis.score,
                    comparative: analysis.comparative,
                    positive: analysis.positive,
                    negative: analysis.negative
                }
            };
        });

        return results;
    }

    /**
     * Detect burnout risk for developers
     */
    async detectBurnoutRisk(developer, activities, sentiments, timeWindow = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeWindow);

        // Filter recent activities and sentiments
        const recentActivities = activities.filter(a => 
            new Date(a.created_at || a.timestamp) >= cutoffDate
        );

        const recentSentiments = sentiments.filter(s =>
            new Date(s.timestamp || s.createdAt) >= cutoffDate
        );

        if (recentActivities.length === 0 && recentSentiments.length === 0) {
            return {
                risk: 'unknown',
                confidence: 0,
                reason: 'Insufficient data'
            };
        }

        const signals = [];
        let riskScore = 0;

        // Signal 1: High activity with low sentiment
        const activityCount = recentActivities.length;
        const avgSentiment = recentSentiments.length > 0 ?
            recentSentiments.reduce((sum, s) => sum + (s.avgSentiment || s.comparative || 0), 0) / recentSentiments.length : 0;

        if (activityCount > this.burnoutThresholds.highActivityLowSentiment.activity &&
            avgSentiment < this.burnoutThresholds.highActivityLowSentiment.sentiment) {
            signals.push({
                type: 'high_activity_low_sentiment',
                severity: 'high',
                message: `High activity (${activityCount}) with negative sentiment (${avgSentiment.toFixed(2)})`
            });
            riskScore += 40;
        }

        // Signal 2: Sustained negative sentiment
        const sentimentTrend = this.calculateSentimentTrend(recentSentiments);
        if (sentimentTrend.sustained && sentimentTrend.avgSentiment < this.burnoutThresholds.sustainedNegative.sentiment) {
            signals.push({
                type: 'sustained_negative',
                severity: 'high',
                message: `Sustained negative sentiment over ${timeWindow} days`
            });
            riskScore += 35;
        }

        // Signal 3: Drastic sentiment drop
        const sentimentChange = this.calculateSentimentChange(recentSentiments, 7);
        if (sentimentChange < this.burnoutThresholds.drasticDrop.change) {
            signals.push({
                type: 'drastic_drop',
                severity: 'medium',
                message: `Sentiment dropped by ${Math.abs(sentimentChange).toFixed(2)} in last week`
            });
            riskScore += 25;
        }

        // Signal 4: Declining activity
        const activityTrend = this.calculateActivityTrend(recentActivities);
        if (activityTrend === 'declining') {
            signals.push({
                type: 'declining_activity',
                severity: 'medium',
                message: 'Activity is declining over time'
            });
            riskScore += 20;
        }

        // Signal 5: Working hours pattern
        const workingHoursAnalysis = this.analyzeWorkingHours(recentActivities);
        if (workingHoursAnalysis.irregularHours > 0.3) {
            signals.push({
                type: 'irregular_hours',
                severity: 'low',
                message: `${Math.round(workingHoursAnalysis.irregularHours * 100)}% of activity outside normal hours`
            });
            riskScore += 10;
        }

        // Determine risk level
        let risk = 'low';
        if (riskScore >= 60) risk = 'high';
        else if (riskScore >= 30) risk = 'medium';

        const confidence = Math.min(1, (recentActivities.length + recentSentiments.length) / 50);

        return {
            developer,
            risk,
            riskScore,
            confidence: Math.round(confidence * 100) / 100,
            signals,
            metrics: {
                activityCount,
                avgSentiment: Math.round(avgSentiment * 1000) / 1000,
                sentimentTrend: sentimentTrend.trend,
                activityTrend,
                irregularHours: Math.round(workingHoursAnalysis.irregularHours * 100)
            },
            recommendations: this.getBurnoutRecommendations(risk, signals)
        };
    }

    /**
     * Calculate sentiment trend
     */
    calculateSentimentTrend(sentiments) {
        if (sentiments.length < 3) {
            return { trend: 'insufficient_data', sustained: false, avgSentiment: 0 };
        }

        // Sort by timestamp
        const sorted = sentiments.sort((a, b) => 
            new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
        );

        const values = sorted.map(s => s.avgSentiment || s.comparative || 0);
        const avgSentiment = values.reduce((a, b) => a + b, 0) / values.length;

        // Simple linear regression
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        let trend = 'stable';
        if (slope > 0.05) trend = 'improving';
        else if (slope < -0.05) trend = 'declining';

        // Check if sustained (consistent over time)
        const sustained = values.every(v => v < 0) || values.every(v => v > 0);

        return { trend, sustained, avgSentiment, slope };
    }

    /**
     * Calculate sentiment change over time window
     */
    calculateSentimentChange(sentiments, days) {
        if (sentiments.length < 2) return 0;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const recent = sentiments.filter(s => new Date(s.timestamp || s.createdAt) >= cutoff);
        const older = sentiments.filter(s => new Date(s.timestamp || s.createdAt) < cutoff);

        if (recent.length === 0 || older.length === 0) return 0;

        const recentAvg = recent.reduce((sum, s) => sum + (s.avgSentiment || s.comparative || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + (s.avgSentiment || s.comparative || 0), 0) / older.length;

        return recentAvg - olderAvg;
    }

    /**
     * Calculate activity trend
     */
    calculateActivityTrend(activities) {
        if (activities.length < 5) return 'stable';

        // Group by week
        const weeks = {};
        activities.forEach(a => {
            const date = new Date(a.created_at || a.timestamp);
            const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
            weeks[weekKey] = (weeks[weekKey] || 0) + 1;
        });

        const weekCounts = Object.values(weeks);
        if (weekCounts.length < 2) return 'stable';

        const firstHalf = weekCounts.slice(0, Math.floor(weekCounts.length / 2));
        const secondHalf = weekCounts.slice(Math.floor(weekCounts.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg > firstAvg * 1.2) return 'increasing';
        if (secondAvg < firstAvg * 0.8) return 'declining';
        return 'stable';
    }

    /**
     * Analyze working hours patterns
     */
    analyzeWorkingHours(activities) {
        if (activities.length === 0) {
            return { irregularHours: 0, distribution: {} };
        }

        const hourCounts = {};
        let irregularCount = 0;

        activities.forEach(a => {
            const date = new Date(a.created_at || a.timestamp);
            const hour = date.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;

            // Consider hours outside 8am-8pm as irregular
            if (hour < 8 || hour > 20) {
                irregularCount++;
            }
        });

        return {
            irregularHours: irregularCount / activities.length,
            distribution: hourCounts,
            peakHour: Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        };
    }

    /**
     * Get burnout recommendations
     */
    getBurnoutRecommendations(risk, signals) {
        const recommendations = [];

        if (risk === 'high') {
            recommendations.push('URGENT: Schedule 1-on-1 with developer to discuss workload and wellbeing');
            recommendations.push('Consider redistributing tasks to reduce immediate pressure');
        }

        if (risk === 'medium') {
            recommendations.push('Monitor closely and check in with developer this week');
            recommendations.push('Review sprint commitments and adjust if needed');
        }

        signals.forEach(signal => {
            switch (signal.type) {
                case 'high_activity_low_sentiment':
                    recommendations.push('Acknowledge and appreciate the high volume of work');
                    recommendations.push('Ensure developer is not overcommitted');
                    break;
                case 'sustained_negative':
                    recommendations.push('Investigate source of negativity (technical debt, blockers, team dynamics)');
                    break;
                case 'drastic_drop':
                    recommendations.push('Something changed recently - identify and address the cause');
                    break;
                case 'declining_activity':
                    recommendations.push('Check for disengagement or personal issues');
                    break;
                case 'irregular_hours':
                    recommendations.push('Discuss work-life balance and time management');
                    break;
            }
        });

        if (recommendations.length === 0) {
            recommendations.push('Continue normal monitoring and support');
        }

        return recommendations;
    }

    /**
     * Generate team burnout heatmap
     */
    async generateBurnoutHeatmap(developers, activities, sentiments) {
        const heatmap = [];

        for (const developer of developers) {
            const devActivities = activities.filter(a => 
                (a.author || a.user) === developer
            );

            const devSentiments = sentiments.filter(s =>
                s.author === developer || s.developer === developer
            );

            const burnoutRisk = await this.detectBurnoutRisk(
                developer,
                devActivities,
                devSentiments
            );

            heatmap.push(burnoutRisk);
        }

        // Sort by risk score descending
        heatmap.sort((a, b) => b.riskScore - a.riskScore);

        return {
            heatmap,
            summary: {
                highRisk: heatmap.filter(d => d.risk === 'high').length,
                mediumRisk: heatmap.filter(d => d.risk === 'medium').length,
                lowRisk: heatmap.filter(d => d.risk === 'low').length,
                total: heatmap.length
            }
        };
    }

    /**
     * Analyze team sentiment over time
     */
    analyzeTeamSentiment(sentiments, timeWindow = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeWindow);

        const recentSentiments = sentiments.filter(s =>
            new Date(s.timestamp || s.createdAt) >= cutoffDate
        );

        if (recentSentiments.length === 0) {
            return { avgSentiment: 0, trend: 'no_data', dataPoints: 0 };
        }

        const avgSentiment = recentSentiments.reduce((sum, s) => 
            sum + (s.avgSentiment || s.comparative || 0), 0
        ) / recentSentiments.length;

        const sentimentTrend = this.calculateSentimentTrend(recentSentiments);

        return {
            avgSentiment: Math.round(avgSentiment * 1000) / 1000,
            trend: sentimentTrend.trend,
            dataPoints: recentSentiments.length,
            confidence: Math.min(1, recentSentiments.length / 20)
        };
    }
}

module.exports = new SentimentTrendEngine();
