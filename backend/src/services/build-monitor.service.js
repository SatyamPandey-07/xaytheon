const { getIO } = require('../socket/socket.server');
const llmService = require('./llm.service');

class HealthMonitorService {
    constructor() {
        this.activeBuilds = new Map();
        this.repoHealth = new Map(); // repoName -> 'healthy' | 'warning' | 'error'
        this.remediationSuggestions = new Map(); // buildId -> remediation data
    }

    /**
     * Simulates receiving a build status update from GitHub Webhook
     */
    async handleBuildUpdate(repoName, buildData) {
        const { status, buildId, logs } = buildData;

        this.activeBuilds.set(buildId, { ...buildData, timestamp: new Date() });
        this.updateRepoHealth(repoName, status);

        let aiAnalysis = null;
        let remediation = null;

        if (status === 'failure' && logs) {
            // Autonomous remediation engine
            aiAnalysis = await this.analyzeFailureLogs(logs);
            remediation = await this.generateRemediation(repoName, logs, buildData);

            // Store remediation for later retrieval
            this.remediationSuggestions.set(buildId, remediation);
        }

        const updatePayload = {
            repoName,
            buildId,
            status,
            aiAnalysis,
            remediation,
            timestamp: new Date()
        };

        // Broadcast real-time update via Socket.io
        try {
            const io = getIO();
            io.emit('build_update', updatePayload);

            // Emit specific remediation event
            if (remediation) {
                io.emit('remediation_available', {
                    buildId,
                    repoName,
                    remediation
                });
            }
        } catch (err) {
            console.error("Socket error in HealthMonitor", err);
        }

        return updatePayload;
    }

    updateRepoHealth(repoName, status) {
        if (status === 'failure') {
            this.repoHealth.set(repoName, 'error');
        } else if (status === 'success') {
            this.repoHealth.set(repoName, 'healthy');
        } else {
            this.repoHealth.set(repoName, 'warning');
        }
    }

    async analyzeFailureLogs(logs) {
        const prompt = `The following build just failed. Analyze the logs and suggest a concise fix.
        LOGS:
        ${logs.slice(-500)} // Last 500 chars 
        `;

        // Use existing LLM service
        const analysis = await llmService.generateResponse(prompt, "CI/CD Log Analysis Context");
        return analysis;
    }

    /**
     * AUTONOMOUS REMEDIATION ENGINE
     * Analyzes build failure and generates actionable fix
     */
    async generateRemediation(repoName, logs, buildData) {
        try {
            // Parse logs to identify root cause
            const rootCause = this.identifyRootCause(logs);

            // Generate code patch based on error type
            const patch = await this.generateCodePatch(rootCause, logs);

            // Create remediation plan
            const remediation = {
                id: `remedy_${Date.now()}`,
                buildId: buildData.buildId,
                repoName,
                rootCause,
                patch,
                confidence: this.calculateConfidence(rootCause),
                suggestedBranch: `auto-fix/${rootCause.type}/${Date.now()}`,
                timestamp: new Date(),
                status: 'pending'
            };

            return remediation;
        } catch (error) {
            console.error('Remediation generation failed:', error);
            return null;
        }
    }

    /**
     * Parse logs to identify the root cause of failure
     */
    identifyRootCause(logs) {
        const logsLower = logs.toLowerCase();

        // Lint errors
        if (logsLower.includes('eslint') || logsLower.includes('lint error')) {
            return {
                type: 'lint',
                category: 'code-quality',
                severity: 'medium',
                description: 'ESLint violations detected',
                affectedFiles: this.extractAffectedFiles(logs, /at\s+(.+\.js):/g)
            };
        }

        // Test failures
        if (logsLower.includes('test failed') || logsLower.includes('assertion')) {
            return {
                type: 'test',
                category: 'testing',
                severity: 'high',
                description: 'Unit test failures',
                affectedFiles: this.extractAffectedFiles(logs, /in\s+(.+\.test\.js)/g)
            };
        }

        // Dependency issues
        if (logsLower.includes('cannot find module') || logsLower.includes('enoent')) {
            return {
                type: 'dependency',
                category: 'environment',
                severity: 'high',
                description: 'Missing dependencies or files',
                affectedFiles: this.extractMissingModules(logs)
            };
        }

        // Syntax errors
        if (logsLower.includes('syntaxerror') || logsLower.includes('unexpected token')) {
            return {
                type: 'syntax',
                category: 'code-quality',
                severity: 'critical',
                description: 'JavaScript syntax errors',
                affectedFiles: this.extractAffectedFiles(logs, /at\s+(.+\.js):/g)
            };
        }

        // Type errors
        if (logsLower.includes('typeerror') || logsLower.includes('is not a function')) {
            return {
                type: 'runtime',
                category: 'code-logic',
                severity: 'high',
                description: 'Runtime type errors',
                affectedFiles: this.extractAffectedFiles(logs, /at\s+(.+\.js):/g)
            };
        }

        // Default unknown error
        return {
            type: 'unknown',
            category: 'general',
            severity: 'medium',
            description: 'Build failure - manual review required',
            affectedFiles: []
        };
    }

    extractAffectedFiles(logs, regex) {
        const matches = [];
        let match;
        while ((match = regex.exec(logs)) !== null) {
            if (match[1] && !matches.includes(match[1])) {
                matches.push(match[1]);
            }
        }
        return matches.slice(0, 5); // Limit to 5 files
    }

    extractMissingModules(logs) {
        const moduleRegex = /Cannot find module ['"](.+?)['"]/g;
        return this.extractAffectedFiles(logs, moduleRegex);
    }

    /**
     * Generate code patch based on error type
     */
    async generateCodePatch(rootCause, logs) {
        switch (rootCause.type) {
            case 'lint':
                return this.generateLintFix(logs);

            case 'dependency':
                return this.generateDependencyFix(rootCause);

            case 'syntax':
                return this.generateSyntaxFix(logs);

            case 'test':
                return this.generateTestFix(logs);

            default:
                return {
                    type: 'manual',
                    description: 'Requires manual intervention',
                    suggestion: 'Review logs and apply fixes manually'
                };
        }
    }

    generateLintFix(logs) {
        return {
            type: 'auto-fix',
            command: 'npm run lint -- --fix',
            description: 'Run ESLint auto-fix',
            files: [],
            script: `
#!/bin/bash
# Auto-fix ESLint violations
npm run lint -- --fix
git add .
git commit -m "fix: auto-fix ESLint violations"
            `.trim()
        };
    }

    generateDependencyFix(rootCause) {
        const missingModules = rootCause.affectedFiles;
        return {
            type: 'install',
            command: `npm install ${missingModules.join(' ')}`,
            description: `Install missing dependencies: ${missingModules.join(', ')}`,
            files: ['package.json', 'package-lock.json'],
            script: `
#!/bin/bash
# Install missing dependencies
npm install ${missingModules.join(' ')}
git add package.json package-lock.json
git commit -m "fix: install missing dependencies"
            `.trim()
        };
    }

    generateSyntaxFix(logs) {
        // Extract syntax error details
        const errorMatch = logs.match(/SyntaxError: (.+)/);
        const errorMsg = errorMatch ? errorMatch[1] : 'Unknown syntax error';

        return {
            type: 'code-edit',
            description: `Fix syntax error: ${errorMsg}`,
            suggestion: 'Review the syntax error and apply the suggested fix',
            files: this.extractAffectedFiles(logs, /at\s+(.+\.js):/g),
            script: `
# Manual fix required
# Error: ${errorMsg}
# Review affected files and correct syntax
            `.trim()
        };
    }

    generateTestFix(logs) {
        return {
            type: 'test-update',
            description: 'Update failing tests or fix implementation',
            suggestion: 'Review test failures and update assertions or implementation',
            command: 'npm test -- --updateSnapshot',
            files: this.extractAffectedFiles(logs, /in\s+(.+\.test\.js)/g),
            script: `
#!/bin/bash
# Update test snapshots if applicable
npm test -- --updateSnapshot
git add .
git commit -m "fix: update test snapshots"
            `.trim()
        };
    }

    calculateConfidence(rootCause) {
        const confidenceMap = {
            'lint': 0.95,
            'dependency': 0.90,
            'test': 0.70,
            'syntax': 0.60,
            'runtime': 0.50,
            'unknown': 0.20
        };
        return confidenceMap[rootCause.type] || 0.30;
    }

    /**
     * Get remediation suggestion for a build
     */
    getRemediation(buildId) {
        return this.remediationSuggestions.get(buildId);
    }

    /**
     * Mark remediation as applied
     */
    markRemediationApplied(buildId) {
        const remediation = this.remediationSuggestions.get(buildId);
        if (remediation) {
            remediation.status = 'applied';
            remediation.appliedAt = new Date();
        }
        return remediation;
    }

    getDashboardData() {
        return {
            repos: Array.from(this.repoHealth.entries()).map(([name, status]) => ({ name, status })),
            recentBuilds: Array.from(this.activeBuilds.values()).slice(-5),
            pendingRemediations: Array.from(this.remediationSuggestions.values())
                .filter(r => r.status === 'pending')
        };
    }
}

module.exports = new HealthMonitorService();
