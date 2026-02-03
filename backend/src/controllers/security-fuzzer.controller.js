/**
 * Security Fuzzer Controller
 * Handles vulnerability analysis, path tracing, and test generation
 */

const taintAnalyzer = require('../services/taint-analyzer.service');
const vulnerabilityPathTracer = require('../services/vulnerability-path.service');
const securityTestGenerator = require('../services/security-test-generator.service');
const cveScorer = require('../services/cve-scorer.service');
const fs = require('fs').promises;
const path = require('path');

class SecurityFuzzerController {
    /**
     * Analyze project for taint flows
     */
    async analyzeTaintFlows(req, res) {
        try {
            const { files } = req.body;

            if (!files || !Array.isArray(files)) {
                return res.status(400).json({
                    error: 'Missing required parameter: files (array)'
                });
            }

            const analysis = await taintAnalyzer.analyzeProject(files);

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error analyzing taint flows:', error);
            res.status(500).json({
                error: 'Failed to analyze taint flows',
                message: error.message
            });
        }
    }

    /**
     * Trace vulnerability exploit paths
     */
    async traceExploitPaths(req, res) {
        try {
            const { packageJson, importMap, vulnerabilities } = req.body;

            if (!packageJson || !vulnerabilities) {
                return res.status(400).json({
                    error: 'Missing required parameters: packageJson, vulnerabilities'
                });
            }

            // Build dependency graph
            vulnerabilityPathTracer.buildDependencyGraph(
                packageJson,
                importMap || {}
            );

            // Analyze all vulnerabilities
            const results = vulnerabilityPathTracer.analyzeAllVulnerabilities(vulnerabilities);

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            console.error('Error tracing exploit paths:', error);
            res.status(500).json({
                error: 'Failed to trace exploit paths',
                message: error.message
            });
        }
    }

    /**
     * Generate security tests for vulnerabilities
     */
    async generateSecurityTests(req, res) {
        try {
            const { vulnerabilities, exploitPaths } = req.body;

            if (!vulnerabilities) {
                return res.status(400).json({
                    error: 'Missing required parameter: vulnerabilities'
                });
            }

            const testSuites = securityTestGenerator.generateMultipleTestSuites(
                vulnerabilities,
                exploitPaths || []
            );

            res.json({
                success: true,
                data: testSuites
            });
        } catch (error) {
            console.error('Error generating security tests:', error);
            res.status(500).json({
                error: 'Failed to generate security tests',
                message: error.message
            });
        }
    }

    /**
     * Score CVE impact
     */
    async scoreCVE(req, res) {
        try {
            const { cve, exploitPaths, projectContext } = req.body;

            if (!cve) {
                return res.status(400).json({
                    error: 'Missing required parameter: cve'
                });
            }

            const score = await cveScorer.calculateImpactScore(
                cve,
                exploitPaths || [],
                projectContext || {}
            );

            res.json({
                success: true,
                data: score
            });
        } catch (error) {
            console.error('Error scoring CVE:', error);
            res.status(500).json({
                error: 'Failed to score CVE',
                message: error.message
            });
        }
    }

    /**
     * Score multiple CVEs
     */
    async scoreMultipleCVEs(req, res) {
        try {
            const { vulnerabilities, projectContext } = req.body;

            if (!vulnerabilities || !Array.isArray(vulnerabilities)) {
                return res.status(400).json({
                    error: 'Missing required parameter: vulnerabilities (array)'
                });
            }

            const scores = await cveScorer.scoreMultipleCVEs(
                vulnerabilities,
                projectContext || {}
            );

            res.json({
                success: true,
                data: scores
            });
        } catch (error) {
            console.error('Error scoring CVEs:', error);
            res.status(500).json({
                error: 'Failed to score CVEs',
                message: error.message
            });
        }
    }

    /**
     * Get risk matrix
     */
    async getRiskMatrix(req, res) {
        try {
            const { scores } = req.body;

            if (!scores || !Array.isArray(scores)) {
                return res.status(400).json({
                    error: 'Missing required parameter: scores (array)'
                });
            }

            const matrix = cveScorer.generateRiskMatrix(scores);

            res.json({
                success: true,
                data: matrix
            });
        } catch (error) {
            console.error('Error generating risk matrix:', error);
            res.status(500).json({
                error: 'Failed to generate risk matrix',
                message: error.message
            });
        }
    }

    /**
     * Comprehensive security analysis
     */
    async analyzeProject(req, res) {
        try {
            const { projectPath, packageJson, importMap } = req.body;

            if (!projectPath && !packageJson) {
                return res.status(400).json({
                    error: 'Missing required parameter: projectPath or packageJson'
                });
            }

            // Read project files (if path provided)
            let files = [];
            if (projectPath) {
                files = await this.readProjectFiles(projectPath);
            }

            // Analyze taint flows
            const taintAnalysis = await taintAnalyzer.analyzeProject(files);

            // Build dependency graph and trace vulnerabilities
            let pathAnalysis = null;
            if (packageJson) {
                vulnerabilityPathTracer.buildDependencyGraph(
                    packageJson,
                    importMap || {}
                );

                // Get vulnerabilities from taint analysis
                const vulnerabilities = taintAnalysis.flows.map(flow => ({
                    package: flow.filePath,
                    type: flow.sinkType,
                    severity: flow.severity >= 8 ? 'high' : flow.severity >= 6 ? 'medium' : 'low',
                    title: flow.exploitScenario
                }));

                pathAnalysis = vulnerabilityPathTracer.analyzeAllVulnerabilities(vulnerabilities);
            }

            // Score vulnerabilities
            const vulnsWithPaths = taintAnalysis.flows.map((flow, index) => ({
                ...flow,
                exploitPaths: pathAnalysis?.results?.[index]?.exploitPaths || []
            }));

            const scores = await cveScorer.scoreMultipleCVEs(vulnsWithPaths, {
                environment: 'production',
                criticality: 'high'
            });

            // Generate test suites
            const tests = securityTestGenerator.generateMultipleTestSuites(
                taintAnalysis.flows,
                vulnsWithPaths.flatMap(v => v.exploitPaths)
            );

            res.json({
                success: true,
                data: {
                    taintAnalysis,
                    pathAnalysis,
                    scores,
                    tests,
                    summary: {
                        totalVulnerabilities: taintAnalysis.totalFlows,
                        criticalVulnerabilities: scores.criticalCount,
                        publiclyReachable: pathAnalysis?.publiclyExposed || 0,
                        testSuitesGenerated: tests.totalSuites,
                        riskScore: taintAnalysis.riskScore
                    }
                }
            });
        } catch (error) {
            console.error('Error analyzing project:', error);
            res.status(500).json({
                error: 'Failed to analyze project',
                message: error.message
            });
        }
    }

    /**
     * Read project files for analysis
     */
    async readProjectFiles(projectPath) {
        const files = [];

        async function readDir(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip node_modules and other directories
                if (entry.isDirectory()) {
                    if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                        await readDir(fullPath);
                    }
                } else if (entry.isFile()) {
                    // Only read JS/TS files
                    if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
                        try {
                            const content = await fs.readFile(fullPath, 'utf-8');
                            files.push({
                                path: fullPath.replace(projectPath, ''),
                                content
                            });
                        } catch (error) {
                            console.error(`Error reading file ${fullPath}:`, error);
                        }
                    }
                }
            }
        }

        await readDir(projectPath);
        return files;
    }

    /**
     * Generate 3D visualization data
     */
    async getVisualizationData(req, res) {
        try {
            const { packageJson, importMap, vulnerabilities } = req.body;

            if (!packageJson) {
                return res.status(400).json({
                    error: 'Missing required parameter: packageJson'
                });
            }

            // Build dependency graph
            vulnerabilityPathTracer.buildDependencyGraph(
                packageJson,
                importMap || {}
            );

            // Analyze vulnerabilities
            const results = vulnerabilityPathTracer.analyzeAllVulnerabilities(
                vulnerabilities || []
            );

            // Get visualization data
            const vizData = results.visualization;

            res.json({
                success: true,
                data: vizData
            });
        } catch (error) {
            console.error('Error generating visualization data:', error);
            res.status(500).json({
                error: 'Failed to generate visualization data',
                message: error.message
            });
        }
    }

    /**
     * Download generated test file
     */
    async downloadTestFile(req, res) {
        try {
            const { vulnerability, exploitPath } = req.body;

            if (!vulnerability) {
                return res.status(400).json({
                    error: 'Missing required parameter: vulnerability'
                });
            }

            const testSuite = securityTestGenerator.generateTestSuite(
                vulnerability,
                exploitPath
            );

            res.setHeader('Content-Type', 'application/javascript');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${testSuite.fileName}"`
            );
            res.send(testSuite.content);
        } catch (error) {
            console.error('Error downloading test file:', error);
            res.status(500).json({
                error: 'Failed to download test file',
                message: error.message
            });
        }
    }
}

module.exports = new SecurityFuzzerController();
