/**
 * Library Extraction Suggester Service
 * AI-powered suggestions for extracting common logic into shared libraries
 */

const astFingerprintService = require('./ast-fingerprint.service');
const path = require('path');

class LibraryExtractionService {
    constructor() {
        // Thresholds for extraction recommendations
        this.minOccurrences = 3; // Minimum times code must appear
        this.minSimilarity = 0.85; // Minimum similarity to consider
        this.minComplexity = 5; // Minimum complexity to be worth extracting
        this.minLinesOfCode = 10; // Minimum LOC to extract
    }

    /**
     * Analyze code clusters and suggest library extractions
     */
    suggestLibraryExtractions(fingerprints, similarPairs) {
        const clusters = this.clusterSimilarCode(similarPairs);
        const suggestions = [];

        clusters.forEach((cluster, idx) => {
            const suggestion = this.analyzeCluster(cluster, fingerprints, idx);
            
            if (this.isWorthExtracting(suggestion)) {
                suggestions.push(suggestion);
            }
        });

        // Sort by priority
        suggestions.sort((a, b) => b.priority - a.priority);

        return suggestions;
    }

    /**
     * Cluster similar code into groups
     */
    clusterSimilarCode(similarPairs) {
        const clusters = [];
        const processed = new Set();

        similarPairs.forEach(pair => {
            if (pair.similarity < this.minSimilarity * 100) return;

            const key1 = pair.file1;
            const key2 = pair.file2;

            if (processed.has(key1) || processed.has(key2)) return;

            // Start a new cluster
            const cluster = {
                files: [key1, key2],
                avgSimilarity: pair.similarity,
                pairs: [pair]
            };

            processed.add(key1);
            processed.add(key2);

            // Try to grow the cluster
            similarPairs.forEach(otherPair => {
                if (otherPair.similarity < this.minSimilarity * 100) return;
                
                const hasFile1 = cluster.files.includes(otherPair.file1);
                const hasFile2 = cluster.files.includes(otherPair.file2);

                if ((hasFile1 || hasFile2) && !(hasFile1 && hasFile2)) {
                    if (hasFile1 && !processed.has(otherPair.file2)) {
                        cluster.files.push(otherPair.file2);
                        cluster.pairs.push(otherPair);
                        processed.add(otherPair.file2);
                    } else if (hasFile2 && !processed.has(otherPair.file1)) {
                        cluster.files.push(otherPair.file1);
                        cluster.pairs.push(otherPair);
                        processed.add(otherPair.file1);
                    }
                }
            });

            clusters.push(cluster);
        });

        return clusters;
    }

    /**
     * Analyze a cluster and generate extraction suggestion
     */
    analyzeCluster(cluster, fingerprints, clusterIdx) {
        // Get fingerprints for cluster files
        const clusterFingerprints = fingerprints.filter(fp => 
            cluster.files.includes(fp.filePath)
        );

        // Calculate cluster metrics
        const avgComplexity = clusterFingerprints.reduce(
            (sum, fp) => sum + fp.features.complexity, 0
        ) / clusterFingerprints.length;

        const avgLOC = clusterFingerprints.reduce(
            (sum, fp) => sum + fp.metadata.linesOfCode, 0
        ) / clusterFingerprints.length;

        const totalFunctions = clusterFingerprints.reduce(
            (sum, fp) => sum + fp.features.functionCount, 0
        );

        // Identify common functionality patterns
        const commonPatterns = this.identifyCommonPatterns(clusterFingerprints);

        // Generate library name suggestion
        const suggestedName = this.generateLibraryName(commonPatterns, clusterIdx);

        // Calculate priority score
        const priority = this.calculatePriority(
            cluster.files.length,
            avgComplexity,
            avgLOC,
            cluster.avgSimilarity
        );

        // Generate extraction plan
        const extractionPlan = this.generateExtractionPlan(
            clusterFingerprints,
            suggestedName
        );

        return {
            id: `extraction-${clusterIdx + 1}`,
            suggestedLibraryName: suggestedName,
            description: this.generateDescription(commonPatterns, cluster.files.length),
            affectedFiles: cluster.files.map(f => ({
                path: f,
                basename: path.basename(f),
                directory: path.dirname(f)
            })),
            metrics: {
                occurrences: cluster.files.length,
                avgSimilarity: parseFloat(cluster.avgSimilarity.toFixed(2)),
                avgComplexity: parseFloat(avgComplexity.toFixed(2)),
                avgLinesOfCode: Math.round(avgLOC),
                totalFunctions
            },
            patterns: commonPatterns,
            extractionPlan,
            priority,
            impact: this.calculateImpact(cluster.files.length, avgLOC),
            recommendation: this.generateRecommendation(priority, cluster.files.length)
        };
    }

    /**
     * Identify common patterns in code
     */
    identifyCommonPatterns(fingerprints) {
        const patterns = {
            controlFlow: this.findCommonControlFlow(fingerprints),
            dependencies: this.findCommonDependencies(fingerprints),
            functionality: this.inferFunctionality(fingerprints)
        };

        return patterns;
    }

    /**
     * Find common control flow patterns
     */
    findCommonControlFlow(fingerprints) {
        const controlFlowMap = new Map();

        fingerprints.forEach(fp => {
            fp.features.complexity && controlFlowMap.set(
                fp.features.complexity,
                (controlFlowMap.get(fp.features.complexity) || 0) + 1
            );
        });

        return {
            avgComplexity: Array.from(controlFlowMap.entries())
                .reduce((sum, [complexity, count]) => sum + complexity * count, 0) / fingerprints.length,
            patterns: ['conditional-logic', 'iteration', 'error-handling']
        };
    }

    /**
     * Find common dependencies
     */
    findCommonDependencies(fingerprints) {
        const depMap = new Map();

        fingerprints.forEach(fp => {
            fp.features.dependencies?.forEach(dep => {
                depMap.set(dep, (depMap.get(dep) || 0) + 1);
            });
        });

        // Get dependencies that appear in majority of files
        const threshold = fingerprints.length * 0.5;
        const commonDeps = Array.from(depMap.entries())
            .filter(([dep, count]) => count >= threshold)
            .map(([dep]) => dep);

        return commonDeps;
    }

    /**
     * Infer functionality from patterns
     */
    inferFunctionality(fingerprints) {
        const keywords = [];
        
        fingerprints.forEach(fp => {
            // Extract from file paths
            const fileName = path.basename(fp.filePath, path.extname(fp.filePath));
            const parts = fileName.split(/[-_.]/).filter(p => p.length > 2);
            keywords.push(...parts);
        });

        // Count keyword frequency
        const keywordCount = new Map();
        keywords.forEach(keyword => {
            keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1);
        });

        // Get top keywords
        const topKeywords = Array.from(keywordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([keyword]) => keyword);

        return this.categorizeFunctionality(topKeywords);
    }

    /**
     * Categorize functionality based on keywords
     */
    categorizeFunctionality(keywords) {
        const categories = {
            'data': ['data-processing', 'transformation'],
            'api': ['api-client', 'http-utils'],
            'util': ['utility-functions', 'helpers'],
            'validate': ['validation', 'sanitization'],
            'auth': ['authentication', 'authorization'],
            'format': ['formatting', 'parsing'],
            'cache': ['caching', 'storage'],
            'log': ['logging', 'monitoring']
        };

        for (const keyword of keywords) {
            for (const [key, cat] of Object.entries(categories)) {
                if (keyword.toLowerCase().includes(key)) {
                    return cat;
                }
            }
        }

        return ['common-utilities', 'shared-logic'];
    }

    /**
     * Generate library name
     */
    generateLibraryName(patterns, index) {
        const functionality = patterns.functionality[0] || 'shared';
        const baseName = functionality
            .replace(/[^a-z0-9-]/gi, '-')
            .replace(/-+/g, '-')
            .toLowerCase();

        return `@internal/${baseName}-lib`;
    }

    /**
     * Generate description
     */
    generateDescription(patterns, occurrences) {
        const functionality = patterns.functionality[0] || 'common functionality';
        return `Shared library for ${functionality} extracted from ${occurrences} duplicate implementations`;
    }

    /**
     * Calculate priority score (0-100)
     */
    calculatePriority(occurrences, complexity, loc, similarity) {
        // Weight factors
        const occurrenceScore = Math.min(occurrences * 10, 40); // Max 40 points
        const complexityScore = Math.min(complexity * 2, 20); // Max 20 points
        const locScore = Math.min(loc / 10, 20); // Max 20 points
        const similarityScore = (similarity / 100) * 20; // Max 20 points

        return Math.round(occurrenceScore + complexityScore + locScore + similarityScore);
    }

    /**
     * Calculate impact of extraction
     */
    calculateImpact(occurrences, avgLOC) {
        const duplicateLOC = Math.round((occurrences - 1) * avgLOC);
        const reductionPercent = ((duplicateLOC / (occurrences * avgLOC)) * 100).toFixed(1);

        return {
            codeReduction: {
                lines: duplicateLOC,
                percentage: `${reductionPercent}%`
            },
            maintenanceEffort: {
                before: `${occurrences} locations to maintain`,
                after: '1 shared library',
                improvement: `${((1 - 1/occurrences) * 100).toFixed(0)}% reduction`
            },
            riskLevel: occurrences > 5 ? 'High' : occurrences > 3 ? 'Medium' : 'Low',
            estimatedRefactoringHours: Math.ceil(occurrences * avgLOC / 100)
        };
    }

    /**
     * Generate extraction plan
     */
    generateExtractionPlan(fingerprints, libraryName) {
        const functions = [];
        const dependencies = new Set();
        
        fingerprints.forEach(fp => {
            fp.functions.forEach(func => {
                functions.push({
                    name: func.name,
                    type: func.type,
                    params: func.params,
                    file: fp.filePath
                });
            });
            
            fp.features.dependencies?.forEach(dep => dependencies.add(dep));
        });

        return {
            steps: [
                {
                    step: 1,
                    action: 'Create library package',
                    command: `npm init -y ${libraryName}`,
                    description: 'Initialize new npm package for shared library'
                },
                {
                    step: 2,
                    action: 'Extract common functions',
                    affectedFunctions: functions.length,
                    description: `Extract ${functions.length} functions into library exports`
                },
                {
                    step: 3,
                    action: 'Install dependencies',
                    dependencies: Array.from(dependencies),
                    description: 'Add required dependencies to library package.json'
                },
                {
                    step: 4,
                    action: 'Update imports',
                    affectedFiles: fingerprints.length,
                    description: `Update ${fingerprints.length} files to import from ${libraryName}`
                },
                {
                    step: 5,
                    action: 'Test and validate',
                    description: 'Run tests to ensure functionality is preserved'
                }
            ],
            estimatedCode: this.generateLibraryCode(functions, libraryName),
            migrationGuide: this.generateMigrationGuide(functions, libraryName, fingerprints)
        };
    }

    /**
     * Generate library code template
     */
    generateLibraryCode(functions, libraryName) {
        const uniqueFunctions = this.deduplicateFunctions(functions);
        
        return {
            'package.json': JSON.stringify({
                name: libraryName,
                version: '1.0.0',
                description: 'Shared utility library',
                main: 'index.js',
                type: 'module'
            }, null, 2),
            'index.js': this.generateIndexFile(uniqueFunctions),
            'README.md': this.generateReadme(libraryName, uniqueFunctions)
        };
    }

    /**
     * Deduplicate functions
     */
    deduplicateFunctions(functions) {
        const seen = new Map();
        
        functions.forEach(func => {
            if (!seen.has(func.name)) {
                seen.set(func.name, func);
            }
        });
        
        return Array.from(seen.values());
    }

    /**
     * Generate index.js content
     */
    generateIndexFile(functions) {
        const exports = functions.map(func => 
            `export { ${func.name} } from './${func.name}';`
        ).join('\n');

        return `/**
 * ${functions[0]?.file ? path.basename(path.dirname(functions[0].file)) : 'Shared'} Library
 * Auto-generated from duplicate code analysis
 */

${exports}

export default {
  ${functions.map(f => f.name).join(',\n  ')}
};
`;
    }

    /**
     * Generate README
     */
    generateReadme(libraryName, functions) {
        return `# ${libraryName}

Shared utility library extracted from duplicate code analysis.

## Installation

\`\`\`bash
npm install ${libraryName}
\`\`\`

## Usage

\`\`\`javascript
import { ${functions[0]?.name || 'functionName'} } from '${libraryName}';

// Use the imported function
${functions[0]?.name || 'functionName'}();
\`\`\`

## Available Functions

${functions.map(f => `- \`${f.name}\` - ${f.type} with ${f.params} parameter(s)`).join('\n')}

## Maintenance

This library consolidates logic from ${functions.length} duplicate implementations.
`;
    }

    /**
     * Generate migration guide
     */
    generateMigrationGuide(functions, libraryName, fingerprints) {
        return {
            overview: `Migrate ${fingerprints.length} files to use ${libraryName}`,
            steps: fingerprints.map((fp, idx) => ({
                file: fp.filePath,
                changes: [
                    {
                        type: 'import',
                        add: `import { ${functions.filter(f => f.file === fp.filePath).map(f => f.name).join(', ')} } from '${libraryName}';`
                    },
                    {
                        type: 'remove',
                        description: `Remove duplicate function definitions: ${functions.filter(f => f.file === fp.filePath).map(f => f.name).join(', ')}`
                    }
                ]
            })),
            validation: 'Run existing tests to ensure no regression'
        };
    }

    /**
     * Generate recommendation
     */
    generateRecommendation(priority, occurrences) {
        if (priority >= 80) {
            return {
                level: 'CRITICAL',
                action: 'Extract immediately',
                reasoning: `High priority extraction with ${occurrences} duplicates. Significant maintenance burden.`
            };
        } else if (priority >= 60) {
            return {
                level: 'HIGH',
                action: 'Plan extraction for next sprint',
                reasoning: `Moderate duplication detected. Consider extracting to reduce technical debt.`
            };
        } else if (priority >= 40) {
            return {
                level: 'MEDIUM',
                action: 'Consider for future refactoring',
                reasoning: `Some duplication present. Monitor for growth.`
            };
        } else {
            return {
                level: 'LOW',
                action: 'Monitor only',
                reasoning: `Low priority. Current duplication level is acceptable.`
            };
        }
    }

    /**
     * Check if cluster is worth extracting
     */
    isWorthExtracting(suggestion) {
        return (
            suggestion.metrics.occurrences >= this.minOccurrences &&
            suggestion.metrics.avgSimilarity >= this.minSimilarity * 100 &&
            suggestion.metrics.avgComplexity >= this.minComplexity &&
            suggestion.metrics.avgLinesOfCode >= this.minLinesOfCode
        );
    }

    /**
     * Generate extraction summary
     */
    generateSummary(suggestions) {
        const critical = suggestions.filter(s => s.recommendation.level === 'CRITICAL').length;
        const high = suggestions.filter(s => s.recommendation.level === 'HIGH').length;
        const medium = suggestions.filter(s => s.recommendation.level === 'MEDIUM').length;
        const low = suggestions.filter(s => s.recommendation.level === 'LOW').length;

        const totalCodeReduction = suggestions.reduce(
            (sum, s) => sum + s.impact.codeReduction.lines, 0
        );

        const totalRefactoringHours = suggestions.reduce(
            (sum, s) => sum + s.impact.estimatedRefactoringHours, 0
        );

        return {
            totalSuggestions: suggestions.length,
            byPriority: { critical, high, medium, low },
            potentialImpact: {
                totalLinesReduced: totalCodeReduction,
                estimatedEffort: `${totalRefactoringHours} hours`,
                averageROI: totalCodeReduction > 0 ? `${(totalCodeReduction / totalRefactoringHours).toFixed(0)} lines/hour` : 'N/A'
            },
            topSuggestions: suggestions.slice(0, 5).map(s => ({
                library: s.suggestedLibraryName,
                priority: s.priority,
                occurrences: s.metrics.occurrences,
                impact: s.impact.codeReduction.lines
            }))
        };
    }
}

module.exports = new LibraryExtractionService();
