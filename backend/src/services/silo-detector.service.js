/**
 * Silo Detector Service
 * Identifies knowledge silos and "Bus Factor" risks
 */

class SiloDetectorService {
    constructor() {
        this.SILO_THRESHOLD = 90; // >90% ownership = silo
        this.BUS_FACTOR_THRESHOLD = 2; // Less than 2 experts = risk
    }

    /**
     * Detect knowledge silos in repository
     */
    detectSilos(knowledgeGraph) {
        const silos = [];

        knowledgeGraph.files.forEach(file => {
            const primaryOwnership = file.primaryOwnership;
            
            if (primaryOwnership >= this.SILO_THRESHOLD) {
                const severity = this.calculateSeverity(file);
                
                silos.push({
                    path: file.path,
                    name: file.name,
                    primaryOwner: file.primaryOwner,
                    ownership: primaryOwnership,
                    contributorCount: file.contributors.length,
                    totalCommits: file.totalCommits,
                    complexity: file.complexity,
                    severity,
                    risk: this.assessRisk(severity, file.complexity),
                    recommendations: this.generateRecommendations(file)
                });
            }
        });

        // Sort by severity
        silos.sort((a, b) => b.severity - a.severity);

        return {
            silos,
            totalSilos: silos.length,
            criticalSilos: silos.filter(s => s.risk === 'critical').length,
            highRiskSilos: silos.filter(s => s.risk === 'high').length,
            averageOwnership: this.calculateAverage(silos.map(s => s.ownership)),
            detectedAt: Date.now()
        };
    }

    /**
     * Calculate silo severity score
     */
    calculateSeverity(file) {
        let score = 0;

        // Ownership concentration
        score += (file.primaryOwnership - this.SILO_THRESHOLD) * 2;

        // Low contributor count
        if (file.contributors.length === 1) score += 30;
        else if (file.contributors.length === 2) score += 20;
        else if (file.contributors.length === 3) score += 10;

        // High complexity
        score += file.complexity * 5;

        // High activity (frequently changed)
        if (file.totalCommits > 50) score += 15;
        else if (file.totalCommits > 20) score += 10;

        return Math.min(100, score);
    }

    /**
     * Assess risk level
     */
    assessRisk(severity, complexity) {
        if (severity >= 80 && complexity >= 7) return 'critical';
        if (severity >= 60 || complexity >= 5) return 'high';
        if (severity >= 40) return 'medium';
        return 'low';
    }

    /**
     * Generate recommendations for reducing silo
     */
    generateRecommendations(file) {
        const recommendations = [];

        if (file.contributors.length === 1) {
            recommendations.push({
                action: 'Add Secondary Owner',
                description: `Assign at least one more developer to review and contribute to ${file.name}`,
                priority: 'high'
            });
        }

        if (file.complexity >= 7) {
            recommendations.push({
                action: 'Code Review Session',
                description: 'Conduct knowledge transfer session with team to explain complex logic',
                priority: 'high'
            });

            recommendations.push({
                action: 'Add Documentation',
                description: 'Document architecture decisions and complex algorithms',
                priority: 'medium'
            });
        }

        recommendations.push({
            action: 'Pair Programming',
            description: `Schedule pair programming sessions with ${file.primaryOwner} when modifying this file`,
            priority: 'medium'
        });

        if (file.totalCommits > 30) {
            recommendations.push({
                action: 'Refactor',
                description: 'High churn indicates potential for simplification or modularization',
                priority: 'low'
            });
        }

        return recommendations;
    }

    /**
     * Calculate bus factor for repository
     */
    calculateBusFactor(knowledgeGraph) {
        const criticalFiles = knowledgeGraph.files.filter(
            f => f.complexity >= 7 || f.totalCommits > 50
        );

        const busFactorMap = new Map();

        criticalFiles.forEach(file => {
            const experts = file.contributors.filter(c => 
                parseFloat(c.ownership) >= 30 // Significant contributors
            );

            experts.forEach(expert => {
                if (!busFactorMap.has(expert.author)) {
                    busFactorMap.set(expert.author, {
                        developer: expert.author,
                        criticalFiles: [],
                        totalOwnership: 0,
                        busFactor: 0
                    });
                }

                const data = busFactorMap.get(expert.author);
                data.criticalFiles.push(file.name);
                data.totalOwnership += parseFloat(expert.ownership);
            });
        });

        // Calculate bus factor score
        const busFactorData = Array.from(busFactorMap.values()).map(data => {
            // Bus factor = how much would be lost if this person left
            const uniqueKnowledge = data.criticalFiles.length;
            const avgOwnership = data.totalOwnership / data.criticalFiles.length;
            
            data.busFactor = (uniqueKnowledge * avgOwnership) / 10;
            return data;
        });

        busFactorData.sort((a, b) => b.busFactor - a.busFactor);

        // Overall bus factor = minimum number of people needed to cover 70% of critical files
        const totalCritical = criticalFiles.length;
        const busFactorThreshold = totalCritical * 0.7;
        
        let coveredFiles = new Set();
        let busFactorCount = 0;

        for (const dev of busFactorData) {
            dev.criticalFiles.forEach(f => coveredFiles.add(f));
            busFactorCount++;
            
            if (coveredFiles.size >= busFactorThreshold) break;
        }

        return {
            repositoryBusFactor: busFactorCount,
            risk: busFactorCount <= 2 ? 'critical' : busFactorCount <= 4 ? 'high' : 'medium',
            keyPeople: busFactorData.slice(0, 5),
            criticalFileCount: criticalFiles.length,
            message: busFactorCount <= 2 
                ? `⚠️ Critical: Only ${busFactorCount} people understand 70% of critical code`
                : `${busFactorCount} people cover 70% of critical code`,
            calculatedAt: Date.now()
        };
    }

    /**
     * Identify orphaned files (no recent activity)
     */
    identifyOrphanedFiles(knowledgeGraph) {
        const orphans = [];
        const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);

        knowledgeGraph.files.forEach(file => {
            const hasRecentActivity = file.contributors.some(c => 
                new Date(c.lastCommit).getTime() > sixMonthsAgo
            );

            if (!hasRecentActivity && file.complexity >= 5) {
                orphans.push({
                    path: file.path,
                    name: file.name,
                    lastModified: file.contributors[0]?.lastCommit,
                    primaryOwner: file.primaryOwner,
                    complexity: file.complexity,
                    recommendation: 'Review for relevance or assign new owner'
                });
            }
        });

        return {
            orphans,
            count: orphans.length,
            detectedAt: Date.now()
        };
    }

    /**
     * Generate silo heat map data
     */
    generateSiloHeatMap(knowledgeGraph) {
        const heatMap = [];

        // Group files by directory
        const dirMap = new Map();

        knowledgeGraph.files.forEach(file => {
            const dir = file.path.split('/').slice(0, -1).join('/') || 'root';
            
            if (!dirMap.has(dir)) {
                dirMap.set(dir, {
                    directory: dir,
                    files: [],
                    avgOwnership: 0,
                    siloCount: 0
                });
            }

            const dirData = dirMap.get(dir);
            dirData.files.push(file);
            
            if (file.primaryOwnership >= this.SILO_THRESHOLD) {
                dirData.siloCount++;
            }
        });

        // Calculate averages
        dirMap.forEach((data, dir) => {
            data.avgOwnership = data.files.reduce((sum, f) => 
                sum + f.primaryOwnership, 0
            ) / data.files.length;

            data.siloPercentage = (data.siloCount / data.files.length * 100).toFixed(2);
            data.risk = data.siloPercentage > 50 ? 'high' : data.siloPercentage > 25 ? 'medium' : 'low';

            heatMap.push(data);
        });

        heatMap.sort((a, b) => b.siloPercentage - a.siloPercentage);

        return heatMap;
    }

    /**
     * Track silo trends over time
     */
    trackSiloTrends(historicalData, currentSilos) {
        if (!historicalData || historicalData.length === 0) {
            return {
                trend: 'stable',
                change: 0,
                message: 'No historical data available'
            };
        }

        const previousCount = historicalData[historicalData.length - 1].totalSilos;
        const currentCount = currentSilos.totalSilos;
        const change = currentCount - previousCount;
        const changePercent = (change / previousCount * 100).toFixed(2);

        return {
            trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
            change,
            changePercent,
            previousCount,
            currentCount,
            message: change > 0 
                ? `⚠️ Silos increased by ${change} (${changePercent}%)`
                : change < 0 
                ? `✅ Silos decreased by ${Math.abs(change)} (${Math.abs(changePercent)}%)`
                : '➡️ No change in silo count'
        };
    }

    /**
     * Calculate average
     */
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return (numbers.reduce((sum, n) => sum + n, 0) / numbers.length).toFixed(2);
    }

    /**
     * Generate silo reduction plan
     */
    generateReductionPlan(silos, knowledgeGraph) {
        const plan = {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            estimatedImpact: {}
        };

        // Immediate actions for critical silos
        const criticalSilos = silos.silos.filter(s => s.risk === 'critical');
        criticalSilos.forEach(silo => {
            plan.immediate.push({
                action: `Address critical silo in ${silo.name}`,
                owner: silo.primaryOwner,
                steps: [
                    'Schedule knowledge transfer session',
                    'Assign secondary owner',
                    'Create comprehensive documentation'
                ]
            });
        });

        // Short-term: High risk silos
        const highRiskSilos = silos.silos.filter(s => s.risk === 'high');
        plan.shortTerm = highRiskSilos.slice(0, 5).map(silo => ({
            action: `Reduce isolation in ${silo.name}`,
            owner: silo.primaryOwner,
            steps: [
                'Pair programming sessions',
                'Code review with team',
                'Add inline documentation'
            ]
        }));

        // Long-term: Overall knowledge distribution
        plan.longTerm = [
            {
                action: 'Implement cross-training program',
                description: 'Rotate developers across different modules',
                duration: '6 months'
            },
            {
                action: 'Establish code review standards',
                description: 'Require reviews from multiple developers',
                duration: 'Ongoing'
            },
            {
                action: 'Create knowledge base',
                description: 'Document architectural decisions and complex systems',
                duration: '3 months'
            }
        ];

        // Estimate impact
        plan.estimatedImpact = {
            siloReduction: '30-50%',
            busFactorIncrease: '+2-3 people',
            timeframe: '3-6 months'
        };

        return plan;
    }
}

module.exports = new SiloDetectorService();
