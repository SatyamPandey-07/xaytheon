/**
 * Dynamic Taint Analysis Service
 * AI-driven analysis to trace if user input reaches vulnerable sinks in dependencies
 */

const axios = require('axios');

class TaintAnalyzer {
    constructor() {
        // Common sources where user input enters the system
        this.sources = [
            'req.body', 'req.query', 'req.params', 'req.headers',
            'process.argv', 'process.env', 'fs.readFileSync',
            'readline', 'stdin', 'websocket.message', 'localStorage',
            'sessionStorage', 'window.location', 'document.cookie'
        ];

        // Vulnerable sinks where tainted data can cause exploits
        this.sinks = {
            xss: ['innerHTML', 'outerHTML', 'document.write', 'eval', 'Function'],
            sqli: ['db.query', 'db.execute', 'connection.query', 'knex.raw'],
            rce: ['exec', 'execSync', 'spawn', 'eval', 'Function', 'child_process'],
            pathTraversal: ['fs.readFile', 'fs.writeFile', 'fs.unlink', 'require'],
            ssrf: ['axios', 'fetch', 'request', 'http.get', 'https.get'],
            prototypePotion: ['Object.assign', 'merge', 'extend', 'lodash.merge'],
            cmdInjection: ['child_process.exec', 'child_process.spawn', 'shelljs.exec'],
            ldapInjection: ['ldapjs.search', 'ldap.search'],
            xmlInjection: ['libxmljs.parseXml', 'xml2js.parseString'],
            nosqlInjection: ['mongodb.find', 'mongoose.find', '$where']
        };

        // Data flow sanitizers that break taint propagation
        this.sanitizers = [
            'validator.escape', 'xss.filterXSS', 'DOMPurify.sanitize',
            'sqlstring.escape', 'mysql.escape', 'pg-format',
            'path.normalize', 'path.resolve', 'sanitize-filename',
            'parseInt', 'parseFloat', 'Number', 'String', 'Boolean',
            'encodeURIComponent', 'JSON.stringify'
        ];
    }

    /**
     * Analyze code for taint propagation from sources to sinks
     */
    async analyzeTaintFlow(code, filePath) {
        const flows = [];
        
        // Parse code into AST (simplified - would use @babel/parser in production)
        const sourceMatches = this.findSources(code);
        const sinkMatches = this.findSinks(code);
        const sanitizerMatches = this.findSanitizers(code);

        // Trace data flow from each source to sinks
        for (const source of sourceMatches) {
            const reachableSinks = this.traceDataFlow(
                source,
                sinkMatches,
                sanitizerMatches,
                code
            );

            for (const sink of reachableSinks) {
                flows.push({
                    source: source.name,
                    sink: sink.name,
                    sinkType: sink.type,
                    path: this.reconstructPath(source, sink, code),
                    sanitized: sink.sanitized,
                    severity: this.calculateSeverity(sink.type, sink.sanitized),
                    lineNumber: sink.lineNumber,
                    code: sink.code,
                    filePath,
                    exploitScenario: this.generateExploitScenario(source, sink)
                });
            }
        }

        return flows;
    }

    /**
     * Find all taint sources in code
     */
    findSources(code) {
        const sources = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            for (const source of this.sources) {
                if (line.includes(source) && !line.trim().startsWith('//')) {
                    sources.push({
                        name: source,
                        lineNumber: index + 1,
                        code: line.trim(),
                        variable: this.extractVariableName(line, source)
                    });
                }
            }
        });

        return sources;
    }

    /**
     * Find all vulnerable sinks in code
     */
    findSinks(code) {
        const sinks = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            for (const [type, patterns] of Object.entries(this.sinks)) {
                for (const pattern of patterns) {
                    if (line.includes(pattern) && !line.trim().startsWith('//')) {
                        sinks.push({
                            name: pattern,
                            type,
                            lineNumber: index + 1,
                            code: line.trim(),
                            variable: this.extractVariableName(line, pattern)
                        });
                    }
                }
            }
        });

        return sinks;
    }

    /**
     * Find sanitizers in code
     */
    findSanitizers(code) {
        const sanitizers = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            for (const sanitizer of this.sanitizers) {
                if (line.includes(sanitizer) && !line.trim().startsWith('//')) {
                    sanitizers.push({
                        name: sanitizer,
                        lineNumber: index + 1,
                        code: line.trim(),
                        variable: this.extractVariableName(line, sanitizer)
                    });
                }
            }
        });

        return sanitizers;
    }

    /**
     * Trace data flow from source to sinks
     */
    traceDataFlow(source, sinks, sanitizers, code) {
        const reachable = [];
        const sourceVar = source.variable;

        if (!sourceVar) return reachable;

        // Simple variable tracking (would use proper dataflow analysis in production)
        const lines = code.split('\n');
        let currentVars = new Set([sourceVar]);
        let sanitized = false;

        for (let i = source.lineNumber; i < lines.length; i++) {
            const line = lines[i];

            // Check if variable is sanitized
            for (const sanitizer of sanitizers) {
                if (sanitizer.lineNumber === i + 1 && 
                    Array.from(currentVars).some(v => line.includes(v))) {
                    sanitized = true;
                }
            }

            // Track variable assignments (e.g., const newVar = taintedVar)
            const assignments = this.extractAssignments(line, currentVars);
            assignments.forEach(v => currentVars.add(v));

            // Check if any sink uses our tainted variables
            for (const sink of sinks) {
                if (sink.lineNumber === i + 1 && 
                    Array.from(currentVars).some(v => line.includes(v))) {
                    reachable.push({
                        ...sink,
                        sanitized,
                        taintedVars: Array.from(currentVars)
                    });
                }
            }
        }

        return reachable;
    }

    /**
     * Reconstruct the path from source to sink
     */
    reconstructPath(source, sink, code) {
        const path = [];
        const lines = code.split('\n');

        path.push({
            step: 1,
            lineNumber: source.lineNumber,
            description: `User input enters via ${source.name}`,
            code: source.code
        });

        // Track intermediate steps (simplified)
        let step = 2;
        for (let i = source.lineNumber; i < sink.lineNumber; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('//') && line.length > 10) {
                // Filter for relevant lines that modify/use the data
                if (line.includes('=') || line.includes('function') || line.includes('=>')) {
                    path.push({
                        step: step++,
                        lineNumber: i + 1,
                        description: 'Data transformation/propagation',
                        code: line
                    });
                }
            }
        }

        path.push({
            step: step,
            lineNumber: sink.lineNumber,
            description: `Reaches vulnerable sink: ${sink.name} (${sink.type})`,
            code: sink.code
        });

        return path;
    }

    /**
     * Extract variable name from code line
     */
    extractVariableName(line, pattern) {
        // Match patterns like: const x = pattern, let x = pattern, etc.
        const assignMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
        if (assignMatch) return assignMatch[1];

        // Match patterns like: x = pattern
        const directMatch = line.match(/(\w+)\s*=/);
        if (directMatch) return directMatch[1];

        // Match function parameters
        const paramMatch = line.match(/\(([^)]+)\)/);
        if (paramMatch) {
            const params = paramMatch[1].split(',');
            return params[0].trim();
        }

        return null;
    }

    /**
     * Extract variable assignments
     */
    extractAssignments(line, taintedVars) {
        const assignments = [];
        
        // Check if any tainted variable is used in an assignment
        for (const taintedVar of taintedVars) {
            if (line.includes(taintedVar)) {
                const match = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
                if (match && match[1] !== taintedVar) {
                    assignments.push(match[1]);
                }
            }
        }

        return assignments;
    }

    /**
     * Calculate severity based on sink type and sanitization status
     */
    calculateSeverity(sinkType, sanitized) {
        const baseSeverity = {
            rce: 10,
            sqli: 9,
            cmdInjection: 9,
            pathTraversal: 8,
            ssrf: 7,
            nosqlInjection: 7,
            xss: 6,
            prototypePotion: 6,
            ldapInjection: 5,
            xmlInjection: 5
        };

        let severity = baseSeverity[sinkType] || 5;

        // Reduce severity if sanitized
        if (sanitized) {
            severity = Math.max(1, severity - 5);
        }

        return severity;
    }

    /**
     * Generate exploit scenario description
     */
    generateExploitScenario(source, sink) {
        const scenarios = {
            rce: `An attacker could execute arbitrary system commands by injecting malicious code through ${source.name}, which flows to ${sink.name} without validation.`,
            sqli: `SQL injection vulnerability: User input from ${source.name} reaches ${sink.name} without proper parameterization, allowing database manipulation.`,
            xss: `Cross-site scripting (XSS) attack possible: Input from ${source.name} is rendered in ${sink.name} without HTML encoding, enabling script injection.`,
            pathTraversal: `Path traversal vulnerability: Attacker could access unauthorized files by manipulating ${source.name} that flows to ${sink.name}.`,
            ssrf: `Server-Side Request Forgery (SSRF): User-controlled ${source.name} influences ${sink.name}, allowing requests to internal resources.`,
            prototypePotion: `Prototype pollution: Malicious input via ${source.name} could modify Object.prototype through ${sink.name}.`,
            cmdInjection: `Command injection: Shell commands in ${sink.name} use unsanitized input from ${source.name}, allowing arbitrary command execution.`,
            nosqlInjection: `NoSQL injection: Query operators in ${sink.name} accept unsanitized user input from ${source.name}.`,
            ldapInjection: `LDAP injection: LDAP queries constructed with unsanitized ${source.name} data.`,
            xmlInjection: `XML injection: User input from ${source.name} parsed as XML in ${sink.name} without validation.`
        };

        return scenarios[sink.type] || `Potential security vulnerability: ${source.name} → ${sink.name}`;
    }

    /**
     * Analyze entire project for taint flows
     */
    async analyzeProject(files) {
        const allFlows = [];

        for (const file of files) {
            if (file.path.endsWith('.js') || file.path.endsWith('.ts')) {
                const flows = await this.analyzeTaintFlow(file.content, file.path);
                allFlows.push(...flows);
            }
        }

        // Calculate project-wide risk score
        const riskScore = this.calculateProjectRisk(allFlows);

        return {
            totalFlows: allFlows.length,
            criticalFlows: allFlows.filter(f => f.severity >= 8).length,
            highFlows: allFlows.filter(f => f.severity >= 6 && f.severity < 8).length,
            mediumFlows: allFlows.filter(f => f.severity >= 4 && f.severity < 6).length,
            lowFlows: allFlows.filter(f => f.severity < 4).length,
            riskScore,
            flows: allFlows.sort((a, b) => b.severity - a.severity)
        };
    }

    /**
     * Calculate overall project risk score
     */
    calculateProjectRisk(flows) {
        if (flows.length === 0) return 0;

        const weighted = flows.reduce((sum, flow) => {
            const weight = flow.sanitized ? 0.3 : 1.0;
            return sum + (flow.severity * weight);
        }, 0);

        return Math.min(100, Math.round((weighted / flows.length) * 10));
    }

    /**
     * Analyze dependency for vulnerable patterns
     */
    async analyzeDependency(packageName, version) {
        try {
            // Check known vulnerabilities from npm audit
            const vulns = await this.checkNPMAudit(packageName, version);

            // Analyze package code for dangerous patterns
            const codePatterns = await this.analyzePackageCode(packageName);

            return {
                package: packageName,
                version,
                vulnerabilities: vulns,
                dangerousPatterns: codePatterns,
                riskLevel: this.calculateDependencyRisk(vulns, codePatterns)
            };
        } catch (error) {
            console.error(`Error analyzing dependency ${packageName}:`, error);
            return null;
        }
    }

    /**
     * Check npm audit for known vulnerabilities
     */
    async checkNPMAudit(packageName, version) {
        try {
            // In production, this would call npm audit API
            // For now, return structure
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Analyze package code for dangerous patterns
     */
    async analyzePackageCode(packageName) {
        const patterns = [];

        // Patterns that indicate potential security issues
        const dangerousPatterns = [
            { pattern: /eval\s*\(/gi, risk: 'Code execution via eval()' },
            { pattern: /Function\s*\(/gi, risk: 'Dynamic code generation' },
            { pattern: /child_process/gi, risk: 'Process execution' },
            { pattern: /fs\.(readFile|writeFile|unlink)/gi, risk: 'File system access' },
            { pattern: /__proto__/gi, risk: 'Prototype manipulation' },
            { pattern: /innerHTML\s*=/gi, risk: 'XSS via innerHTML' }
        ];

        // Note: In production, would fetch and analyze actual package code
        return patterns;
    }

    /**
     * Calculate dependency risk level
     */
    calculateDependencyRisk(vulns, patterns) {
        if (vulns.length > 0) return 'critical';
        if (patterns.length >= 3) return 'high';
        if (patterns.length >= 1) return 'medium';
        return 'low';
    }
}

module.exports = new TaintAnalyzer();
