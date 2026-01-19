/**
 * Risk Detector Service
 * Analyzes Pull Requests for potential merge conflicts and calculates risk scores.
 */

class RiskDetectorService {
    /**
     * Analyzes multiple PRs for a repository to find potential conflicts.
     * @param {string} repo 
     */
    async analyzeConflicts(repo) {
        // Mocking PR data for demonstration
        const prs = [
            { id: 101, title: 'Refactor Auth Middleware', author: 'alice', files: ['backend/src/middleware/auth.js', 'backend/src/app.js'], linesChanged: 450, complexityDelta: 5 },
            { id: 102, title: 'Add Socket service', author: 'bob', files: ['backend/src/app.js', 'backend/src/services/socket.js'], linesChanged: 120, complexityDelta: 2 },
            { id: 103, title: 'Fix Heatmap CSS', author: 'charlie', files: ['heatmap.css'], linesChanged: 30, complexityDelta: 0 },
            { id: 104, title: 'Update Dashboard UI', author: 'dave', files: ['index.html', 'style.css'], linesChanged: 800, complexityDelta: 1 }
        ];

        const conflicts = [];
        const fileMap = {};

        // Build file mapping to detect overlaps
        prs.forEach(pr => {
            pr.files.forEach(file => {
                if (!fileMap[file]) fileMap[file] = [];
                fileMap[file].push(pr.id);
            });
        });

        // Identify PRs with overlapping files
        Object.entries(fileMap).forEach(([file, prIds]) => {
            if (prIds.length > 1) {
                conflicts.push({
                    file,
                    prIds,
                    severity: prIds.length > 2 ? 'High' : 'Medium'
                });
            }
        });

        // Calculate Risk Scores
        const analyzedPrs = prs.map(pr => {
            const riskScore = this.calculateRiskScore(pr);
            return { ...pr, riskScore };
        });

        return {
            repo,
            conflicts,
            analyzedPrs,
            stats: {
                totalActivePrs: prs.length,
                highRiskPrs: analyzedPrs.filter(p => p.riskScore > 70).length,
                potentialConflicts: conflicts.length
            }
        };
    }

    /**
     * Calculates a Risk Score (0-100) based on code churn and complexity.
     */
    calculateRiskScore(pr) {
        let score = 0;

        // Code Churn (Size of change)
        if (pr.linesChanged > 500) score += 40;
        else if (pr.linesChanged > 100) score += 20;
        else score += 5;

        // Complexity Increase
        if (pr.complexityDelta > 10) score += 40;
        else if (pr.complexityDelta > 3) score += 20;
        else score += 10;

        // File count risk
        if (pr.files.length > 5) score += 20;
        else score += 10;

        return Math.min(score, 100);
    }
}

module.exports = new RiskDetectorService();
