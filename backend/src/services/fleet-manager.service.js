/**
 * Fleet Manager Service
 * Handles multi-repository data aggregation and cross-repo analytics
 */

class FleetManagerService {
    /**
     * Aggregate metrics across multiple repositories
     * @param {Array} repositories - Array of repository objects with owner/name
     * @param {string} userId - User ID for authentication
     * @returns {Object} Aggregated fleet metrics
     */
    async aggregateFleetMetrics(repositories, userId) {
        try {
            // Mock data for demonstration - in production, fetch from GitHub API
            const fleetData = await Promise.all(
                repositories.map(async (repo) => {
                    const repoData = await this.fetchRepositoryData(repo.owner, repo.name, userId);
                    return {
                        fullName: `${repo.owner}/${repo.name}`,
                        ...repoData,
                        doraMetrics: await this.calculateDoraMetrics(repo.owner, repo.name)
                    };
                })
            );

            // Calculate fleet-wide aggregates
            const aggregated = this.calculateFleetAggregates(fleetData);
            
            return {
                repositories: fleetData,
                fleetSummary: aggregated,
                healthScore: this.calculateOrganizationHealthScore(fleetData),
                alerts: this.generateSmartAlerts(fleetData)
            };
        } catch (error) {
            console.error("Fleet aggregation error:", error);
            throw error;
        }
    }

    /**
     * Fetch individual repository data
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} userId - User ID
     * @returns {Object} Repository metrics
     */
    async fetchRepositoryData(owner, repo, userId) {
        // Mock implementation - replace with actual GitHub API calls
        const mockData = {
            name: repo,
            owner: owner,
            stars: Math.floor(Math.random() * 10000) + 100,
            forks: Math.floor(Math.random() * 2000) + 50,
            openIssues: Math.floor(Math.random() * 300) + 10,
            watchers: Math.floor(Math.random() * 5000) + 200,
            totalCommits: Math.floor(Math.random() * 50000) + 1000,
            contributors: Math.floor(Math.random() * 100) + 5,
            languages: {
                JavaScript: Math.random() * 60 + 20,
                Python: Math.random() * 30 + 10,
                TypeScript: Math.random() * 25 + 5
            },
            lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        };

        return mockData;
    }

    /**
     * Calculate DORA (DevOps Research and Assessment) metrics for a repository
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Object} DORA metrics
     */
    async calculateDoraMetrics(owner, repo) {
        // Mock DORA metrics calculation
        return {
            deploymentFrequency: Math.random() * 50 + 10, // Deployments per day
            leadTimeForChanges: Math.random() * 10 + 1, // Hours
            meanTimeToRecovery: Math.random() * 8 + 2, // Hours
            changeFailureRate: Math.random() * 15 + 2, // Percentage
            velocity: Math.random() * 100 + 50 // Story points per sprint
        };
    }

    /**
     * Calculate fleet-wide aggregates
     * @param {Array} fleetData - Array of repository data
     * @returns {Object} Aggregated metrics
     */
    calculateFleetAggregates(fleetData) {
        const totalRepos = fleetData.length;
        const totalStars = fleetData.reduce((sum, repo) => sum + repo.stars, 0);
        const totalCommits = fleetData.reduce((sum, repo) => sum + repo.totalCommits, 0);
        const totalContributors = fleetData.reduce((sum, repo) => sum + repo.contributors, 0);
        const totalIssues = fleetData.reduce((sum, repo) => sum + repo.openIssues, 0);

        // Average metrics
        const avgStars = totalStars / totalRepos;
        const avgCommits = totalCommits / totalRepos;
        const avgContributors = totalContributors / totalRepos;

        // Velocity comparison
        const sortedByVelocity = [...fleetData].sort((a, b) => 
            b.doraMetrics.velocity - a.doraMetrics.velocity
        );

        return {
            totalRepositories: totalRepos,
            totalStars: totalStars,
            totalCommits: totalCommits,
            totalContributors: totalContributors,
            totalOpenIssues: totalIssues,
            averageStars: Math.round(avgStars),
            averageCommits: Math.round(avgCommits),
            averageContributors: Math.round(avgContributors),
            topPerformers: sortedByVelocity.slice(0, 3).map(r => r.fullName),
            bottomPerformers: sortedByVelocity.slice(-3).reverse().map(r => r.fullName)
        };
    }

    /**
     * Calculate organization health score based on fleet metrics
     * @param {Array} fleetData - Array of repository data
     * @returns {number} Health score (0-100)
     */
    calculateOrganizationHealthScore(fleetData) {
        if (fleetData.length === 0) return 0;

        let score = 0;
        
        // Distribution health (25%)
        const starDistribution = this.calculateDistributionScore(
            fleetData.map(r => r.stars)
        );
        score += starDistribution * 0.25;

        // Activity health (25%)
        const commitActivity = this.calculateActivityScore(
            fleetData.map(r => r.totalCommits)
        );
        score += commitActivity * 0.25;

        // Maintenance health (25%)
        const maintenanceScore = this.calculateMaintenanceScore(fleetData);
        score += maintenanceScore * 0.25;

        // Growth health (25%)
        const growthScore = this.calculateGrowthScore(fleetData);
        score += growthScore * 0.25;

        return Math.round(score);
    }

    /**
     * Generate smart alerts for fleet issues
     * @param {Array} fleetData - Array of repository data
     * @returns {Array} Alert objects
     */
    generateSmartAlerts(fleetData) {
        const alerts = [];

        fleetData.forEach(repo => {
            // Low activity alert
            if (repo.totalCommits < 100) {
                alerts.push({
                    type: 'warning',
                    severity: 'medium',
                    repository: repo.fullName,
                    message: 'Low commit activity detected',
                    recommendation: 'Consider increasing development activity'
                });
            }

            // High open issues alert
            if (repo.openIssues > 200) {
                alerts.push({
                    type: 'warning',
                    severity: 'high',
                    repository: repo.fullName,
                    message: 'High number of open issues',
                    recommendation: 'Prioritize issue resolution'
                });
            }

            // Low contributor count alert
            if (repo.contributors < 3) {
                alerts.push({
                    type: 'info',
                    severity: 'medium',
                    repository: repo.fullName,
                    message: 'Limited contributor base',
                    recommendation: 'Encourage more contributors to join'
                });
            }

            // Poor DORA metrics alert
            if (repo.doraMetrics.changeFailureRate > 15) {
                alerts.push({
                    type: 'danger',
                    severity: 'high',
                    repository: repo.fullName,
                    message: 'High change failure rate',
                    recommendation: 'Review deployment processes and testing'
                });
            }
        });

        return alerts.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
    }

    // Helper methods for health score calculations
    calculateDistributionScore(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = better distribution = higher score
        const coefficientOfVariation = stdDev / mean;
        return Math.max(0, 100 - (coefficientOfVariation * 50));
    }

    calculateActivityScore(commitCounts) {
        const avgCommits = commitCounts.reduce((a, b) => a + b, 0) / commitCounts.length;
        // Normalize to 0-100 scale (assuming 1000+ commits is healthy)
        return Math.min(100, (avgCommits / 1000) * 100);
    }

    calculateMaintenanceScore(fleetData) {
        const issueRatios = fleetData.map(repo => repo.openIssues / Math.max(repo.stars, 1));
        const avgIssueRatio = issueRatios.reduce((a, b) => a + b, 0) / issueRatios.length;
        // Lower ratio = better maintenance = higher score
        return Math.max(0, 100 - (avgIssueRatio * 1000));
    }

    calculateGrowthScore(fleetData) {
        // Mock growth calculation based on recent activity
        const recentActivity = fleetData.filter(repo => {
            const lastUpdate = new Date(repo.lastUpdated);
            const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate < 30; // Updated in last 30 days
        });
        
        return (recentActivity.length / fleetData.length) * 100;
    }

    /**
     * Compare repositories side-by-side
     * @param {Array} repositories - Array of repository identifiers
     * @returns {Object} Comparison data
     */
    async compareRepositories(repositories) {
        const comparisonData = await Promise.all(
            repositories.map(async (repo) => {
                const data = await this.fetchRepositoryData(repo.owner, repo.name);
                return {
                    fullName: `${repo.owner}/${repo.name}`,
                    ...data,
                    doraMetrics: await this.calculateDoraMetrics(repo.owner, repo.name)
                };
            })
        );

        return this.generateComparisonReport(comparisonData);
    }

    /**
     * Generate comparison report
     * @param {Array} repoData - Array of repository data
     * @returns {Object} Formatted comparison report
     */
    generateComparisonReport(repoData) {
        const metrics = [
            { key: 'stars', label: 'Stars', format: 'number' },
            { key: 'forks', label: 'Forks', format: 'number' },
            { key: 'contributors', label: 'Contributors', format: 'number' },
            { key: 'totalCommits', label: 'Total Commits', format: 'number' },
            { key: 'openIssues', label: 'Open Issues', format: 'number' },
            { key: 'velocity', label: 'Velocity (SP/Sprint)', format: 'decimal' }
        ];

        const comparisonTable = repoData.map(repo => {
            const row = { repository: repo.fullName };
            metrics.forEach(metric => {
                if (metric.key === 'velocity') {
                    row[metric.key] = repo.doraMetrics.velocity;
                } else {
                    row[metric.key] = repo[metric.key];
                }
            });
            return row;
        });

        return {
            metrics,
            comparisonTable,
            winners: this.findWinners(repoData, metrics)
        };
    }

    /**
     * Find winners for each metric
     * @param {Array} repoData - Repository data
     * @param {Array} metrics - Metrics to evaluate
     * @returns {Object} Winners by metric
     */
    findWinners(repoData, metrics) {
        const winners = {};
        
        metrics.forEach(metric => {
            const key = metric.key === 'velocity' ? 'doraMetrics.velocity' : metric.key;
            const getValue = (repo) => {
                if (key.includes('.')) {
                    const parts = key.split('.');
                    return repo[parts[0]][parts[1]];
                }
                return repo[key];
            };
            
            const sorted = [...repoData].sort((a, b) => getValue(b) - getValue(a));
            winners[metric.key] = sorted[0].fullName;
        });
        
        return winners;
    }
}

module.exports = new FleetManagerService();