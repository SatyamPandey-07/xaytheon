/**
 * AI Root Cause Analysis Service
 * Analyzes incidents and generates root cause hypotheses
 */

const axios = require('axios');

class AIRootCauseService {
    constructor() {
        this.errorPatterns = this.initializeErrorPatterns();
        this.analysisCache = new Map();
    }

    /**
     * Initialize common error patterns
     */
    initializeErrorPatterns() {
        return {
            // Deployment failures
            dependency: {
                patterns: ['module not found', 'cannot resolve', 'dependency error', 'version mismatch', 'package not installed'],
                confidence: 0.9,
                category: 'dependency',
                suggestedActions: [
                    'Check package.json for version conflicts',
                    'Run npm ci or yarn install --frozen-lockfile',
                    'Verify lockfile is committed',
                    'Check for breaking changes in dependencies'
                ]
            },
            
            configuration: {
                patterns: ['env variable', 'config not found', 'missing secret', 'invalid configuration', 'connection refused'],
                confidence: 0.85,
                category: 'configuration',
                suggestedActions: [
                    'Verify environment variables are set',
                    'Check configuration file paths',
                    'Validate secret/credential availability',
                    'Review service connection strings'
                ]
            },

            resource: {
                patterns: ['out of memory', 'disk full', 'no space left', 'resource exhausted', 'quota exceeded'],
                confidence: 0.95,
                category: 'resource',
                suggestedActions: [
                    'Increase memory limits',
                    'Clean up unused resources',
                    'Check disk space usage',
                    'Review resource quotas and limits'
                ]
            },

            permissions: {
                patterns: ['permission denied', 'access denied', 'unauthorized', 'forbidden', '403 error'],
                confidence: 0.9,
                category: 'permissions',
                suggestedActions: [
                    'Review IAM roles and permissions',
                    'Check file/directory permissions',
                    'Verify service account configuration',
                    'Review CORS and security policies'
                ]
            },

            network: {
                patterns: ['timeout', 'network error', 'connection failed', 'dns lookup failed', 'unreachable'],
                confidence: 0.8,
                category: 'network',
                suggestedActions: [
                    'Check network connectivity',
                    'Verify firewall rules',
                    'Review DNS configuration',
                    'Check service endpoint availability'
                ]
            },

            database: {
                patterns: ['database error', 'query failed', 'connection pool', 'deadlock', 'constraint violation'],
                confidence: 0.85,
                category: 'database',
                suggestedActions: [
                    'Review database logs',
                    'Check connection pool settings',
                    'Verify migration status',
                    'Review query performance'
                ]
            },

            build: {
                patterns: ['compilation error', 'build failed', 'syntax error', 'lint error', 'test failed'],
                confidence: 0.95,
                category: 'build',
                suggestedActions: [
                    'Review recent code changes',
                    'Check for syntax errors',
                    'Run tests locally',
                    'Review build logs in detail'
                ]
            },

            runtime: {
                patterns: ['null pointer', 'undefined', 'reference error', 'type error', 'exception', 'stack overflow'],
                confidence: 0.75,
                category: 'runtime',
                suggestedActions: [
                    'Review stack trace',
                    'Check recent code deployments',
                    'Add null checks',
                    'Review error logs for patterns'
                ]
            }
        };
    }

    /**
     * Analyze incident and generate root cause hypothesis
     */
    async analyzeIncident(incident) {
        try {
            // Check cache
            const cacheKey = `${incident.id}-${incident.createdAt}`;
            if (this.analysisCache.has(cacheKey)) {
                return this.analysisCache.get(cacheKey);
            }

            const analysis = {
                incidentId: incident.id,
                timestamp: Date.now(),
                rootCause: null,
                hypothesis: '',
                confidence: 0,
                category: 'unknown',
                suggestedActions: [],
                correlatedEvents: [],
                impactEstimate: this.estimateImpact(incident)
            };

            // Pattern matching analysis
            const patternMatch = this.matchErrorPatterns(incident);
            if (patternMatch) {
                analysis.rootCause = patternMatch.category;
                analysis.confidence = patternMatch.confidence;
                analysis.category = patternMatch.category;
                analysis.suggestedActions = patternMatch.suggestedActions;
                analysis.hypothesis = this.generateHypothesis(incident, patternMatch);
            }

            // Correlation analysis
            analysis.correlatedEvents = this.findCorrelatedEvents(incident);
            
            // If correlations found, adjust confidence
            if (analysis.correlatedEvents.length > 0) {
                analysis.confidence = Math.min(analysis.confidence + 0.1, 1.0);
                analysis.hypothesis += ` Detected ${analysis.correlatedEvents.length} correlated events.`;
            }

            // PR analysis
            if (incident.relatedPRs && incident.relatedPRs.length > 0) {
                analysis.suspectPRs = this.analyzeSuspectPRs(incident);
                if (analysis.suspectPRs.length > 0) {
                    analysis.hypothesis += ` Suspect PRs: ${analysis.suspectPRs.map(pr => `#${pr.number}`).join(', ')}.`;
                }
            }

            // Cache the analysis
            this.analysisCache.set(cacheKey, analysis);

            return analysis;
        } catch (error) {
            console.error('AI analysis error:', error.message);
            return {
                incidentId: incident.id,
                timestamp: Date.now(),
                rootCause: 'analysis_failed',
                hypothesis: 'Unable to perform automated analysis',
                confidence: 0,
                suggestedActions: ['Manual investigation required'],
                error: error.message
            };
        }
    }

    /**
     * Match error patterns
     */
    matchErrorPatterns(incident) {
        const text = `${incident.title} ${incident.description} ${JSON.stringify(incident.metadata)}`.toLowerCase();
        
        let bestMatch = null;
        let highestScore = 0;

        for (const [key, pattern] of Object.entries(this.errorPatterns)) {
            let matchCount = 0;
            for (const p of pattern.patterns) {
                if (text.includes(p.toLowerCase())) {
                    matchCount++;
                }
            }

            const score = (matchCount / pattern.patterns.length) * pattern.confidence;
            if (score > highestScore) {
                highestScore = score;
                bestMatch = pattern;
            }
        }

        return highestScore > 0.3 ? bestMatch : null;
    }

    /**
     * Generate human-readable hypothesis
     */
    generateHypothesis(incident, patternMatch) {
        const templates = {
            dependency: `The ${incident.type} appears to be caused by a dependency issue. This could be due to missing packages, version conflicts, or incompatible dependencies.`,
            configuration: `The failure is likely due to a configuration issue. Missing environment variables, incorrect settings, or unavailable secrets may be the cause.`,
            resource: `Resource exhaustion detected. The system may have run out of memory, disk space, or hit quota limits.`,
            permissions: `A permissions or access control issue is blocking the operation. Review IAM roles, file permissions, or authentication settings.`,
            network: `Network connectivity issues detected. The service may be unable to reach required endpoints or experiencing timeout errors.`,
            database: `Database-related failure detected. Connection issues, query errors, or migration problems may be the cause.`,
            build: `Build or compilation failure. Recent code changes may have introduced syntax errors or failing tests.`,
            runtime: `Runtime error detected. The code is encountering exceptions during execution, possibly due to recent deployments.`
        };

        return templates[patternMatch.category] || 'Unable to determine specific root cause. Manual investigation recommended.';
    }

    /**
     * Find correlated events
     */
    findCorrelatedEvents(incident) {
        // In a real implementation, this would query the event stream
        // For now, return mock data
        const correlated = [];
        
        // Check if there are multiple failures in same service
        if (incident.metadata?.service) {
            correlated.push({
                type: 'service_failure',
                description: `Multiple failures in ${incident.metadata.service} service`,
                timestamp: incident.createdAt - 300000 // 5 minutes ago
            });
        }

        return correlated;
    }

    /**
     * Analyze suspect PRs
     */
    analyzeSuspectPRs(incident) {
        if (!incident.relatedPRs) return [];

        // Find PRs merged within 2 hours before incident
        const incidentTime = incident.createdAt;
        const twoHoursBefore = incidentTime - (2 * 60 * 60 * 1000);

        return incident.relatedPRs
            .filter(pr => {
                const mergedTime = new Date(pr.mergedAt).getTime();
                return mergedTime >= twoHoursBefore && mergedTime <= incidentTime;
            })
            .map(pr => ({
                ...pr,
                suspicionScore: this.calculateSuspicionScore(pr, incident)
            }))
            .sort((a, b) => b.suspicionScore - a.suspicionScore);
    }

    /**
     * Calculate PR suspicion score
     */
    calculateSuspicionScore(pr, incident) {
        let score = 0;
        
        // Time proximity (closer = higher suspicion)
        const timeDiff = incident.createdAt - new Date(pr.mergedAt).getTime();
        const hoursDiff = timeDiff / (60 * 60 * 1000);
        score += Math.max(0, 10 - hoursDiff) * 10; // Max 100 points

        // Title matching
        const titleWords = pr.title.toLowerCase().split(' ');
        const incidentWords = incident.title.toLowerCase().split(' ');
        const commonWords = titleWords.filter(w => incidentWords.includes(w));
        score += commonWords.length * 5;

        return Math.min(score, 100);
    }

    /**
     * Estimate impact
     */
    estimateImpact(incident) {
        let impact = {
            severity: incident.severity,
            affectedUsers: incident.affectedUsers || 0,
            scope: 'unknown',
            businessImpact: 'low'
        };

        // Determine scope
        if (incident.environment === 'production') {
            impact.scope = 'production';
            impact.businessImpact = incident.severity === 'critical' ? 'high' : 'medium';
        } else if (incident.environment === 'staging') {
            impact.scope = 'staging';
            impact.businessImpact = 'low';
        }

        // Estimate affected users
        if (incident.type === 'deployment_failure' && incident.environment === 'production') {
            impact.affectedUsers = impact.affectedUsers || 10000; // Estimate
        }

        return impact;
    }

    /**
     * Generate remediation plan
     */
    generateRemediationPlan(analysis) {
        const plan = {
            immediate: [],
            shortTerm: [],
            longTerm: []
        };

        // Immediate actions
        plan.immediate.push('Acknowledge incident in War-Room');
        plan.immediate.push('Notify on-call engineer');
        
        if (analysis.category === 'configuration') {
            plan.immediate.push('Rollback deployment');
            plan.immediate.push('Verify configuration values');
        } else if (analysis.category === 'dependency') {
            plan.immediate.push('Rollback to previous version');
            plan.immediate.push('Review dependency changes');
        }

        // Short-term actions
        plan.shortTerm = analysis.suggestedActions || [];

        // Long-term actions
        plan.longTerm.push('Add monitoring for this failure type');
        plan.longTerm.push('Create runbook for similar incidents');
        plan.longTerm.push('Review and improve CI/CD checks');

        return plan;
    }

    /**
     * Clear analysis cache
     */
    clearCache() {
        this.analysisCache.clear();
    }
}

module.exports = new AIRootCauseService();
