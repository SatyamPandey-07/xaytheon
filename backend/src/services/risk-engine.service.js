/**
 * Risk Engine Service
 * Predicts bug propensity using code churn, expertise debt, and historical data.
 */
class RiskEngineService {
    /**
     * Calculates risk scores for all project files.
     */
    async calculateRiskGalaxy() {
        const files = this.getMockFileHistory();

        return files.map(file => {
            const churnScore = this.calculateChurnScore(file.history);
            const expertiseDebt = this.calculateExpertiseDebt(file.authors);
            const complexityScore = file.complexity * 0.4;

            // Final Fragility Score (0-100)
            const fragilityScore = Math.min(100, (churnScore * 0.4) + (expertiseDebt * 0.3) + (complexityScore));

            return {
                id: file.id,
                name: file.name,
                path: file.path,
                score: parseFloat(fragilityScore.toFixed(2)),
                metrics: {
                    churn: churnScore,
                    expertise: expertiseDebt,
                    complexity: file.complexity,
                    historicalBugs: file.historicalBugs
                },
                trend: this.generateTimeline(fragilityScore),
                status: this.getStatus(fragilityScore)
            };
        });
    }

    calculateChurnScore(history) {
        // High frequency of changes in last 30 days = higher churn
        const recentChanges = history.filter(h => h.daysAgo <= 30).length;
        return Math.min(100, recentChanges * 10);
    }

    calculateExpertiseDebt(authors) {
        // If a file has many authors but no clear "owner" (>50% contributions), debt is high
        const totalCommits = authors.reduce((a, b) => a + b.commits, 0);
        const maxCommits = Math.max(...authors.map(a => a.commits));
        const ownershipRatio = maxCommits / totalCommits;

        return Math.min(100, (1 - ownershipRatio) * 100);
    }

    getStatus(score) {
        if (score > 75) return 'CRITICAL';
        if (score > 50) return 'HIGH';
        if (score > 25) return 'MEDIUM';
        return 'LOW';
    }

    generateTimeline(currentScore) {
        // Generate mock historical data for the last 6 months
        const points = [];
        let base = currentScore;
        for (let i = 0; i < 6; i++) {
            points.push({
                month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
                value: Math.max(0, Math.min(100, base + (Math.random() * 20 - 10)))
            });
        }
        return points;
    }

    getMockFileHistory() {
        return [
            {
                id: 1, name: 'auth.service.js', path: 'src/services/auth.service.js', complexity: 85, historicalBugs: 12,
                history: Array.from({ length: 15 }, () => ({ daysAgo: Math.floor(Math.random() * 60) })),
                authors: [{ name: 'dev1', commits: 50 }, { name: 'dev2', commits: 45 }]
            },
            {
                id: 2, name: 'payment.gateway.js', path: 'src/integrations/payment.gateway.js', complexity: 92, historicalBugs: 8,
                history: Array.from({ length: 20 }, () => ({ daysAgo: Math.floor(Math.random() * 30) })),
                authors: [{ name: 'dev3', commits: 30 }, { name: 'dev4', commits: 28 }, { name: 'dev5', commits: 25 }]
            },
            {
                id: 3, name: 'utils.js', path: 'src/utils/utils.js', complexity: 20, historicalBugs: 1,
                history: [{ daysAgo: 45 }, { daysAgo: 100 }],
                authors: [{ name: 'dev1', commits: 80 }]
            },
            {
                id: 4, name: 'socket.server.js', path: 'src/socket/socket.server.js', complexity: 70, historicalBugs: 5,
                history: Array.from({ length: 12 }, () => ({ daysAgo: Math.floor(Math.random() * 40) })),
                authors: [{ name: 'dev2', commits: 40 }, { name: 'dev6', commits: 10 }]
            },
            {
                id: 5, name: 'db.config.js', path: 'src/config/db.js', complexity: 15, historicalBugs: 0,
                history: [{ daysAgo: 200 }],
                authors: [{ name: 'dev1', commits: 100 }]
            }
        ];
    }
}

module.exports = new RiskEngineService();
