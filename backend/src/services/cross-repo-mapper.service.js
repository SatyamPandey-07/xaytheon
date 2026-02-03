/**
 * Cross-Repo Logic Mapping Service
 * Finds duplicated logic across different repositories and microservices
 * Identifies "reinventing the wheel" patterns
 */

const astFingerprintService = require('./ast-fingerprint.service');
const fs = require('fs').promises;
const path = require('path');

class CrossRepoLogicMapper {
    constructor() {
        this.repoIndex = new Map(); // repoName -> fingerprints
        this.globalBucketIndex = new Map(); // bucketId -> [{ repo, fileIndex }]
        this.crossRepoMatches = [];
    }

    /**
     * Index a repository
     */
    async indexRepository(repoPath, repoName) {
        console.log(`Indexing repository: ${repoName}`);
        
        const fingerprints = await astFingerprintService.analyzeDirectory(repoPath);
        
        this.repoIndex.set(repoName, {
            path: repoPath,
            fingerprints,
            indexedAt: Date.now(),
            fileCount: fingerprints.length
        });

        // Update global bucket index
        fingerprints.forEach((fp, idx) => {
            fp.lshBuckets.forEach(bucket => {
                if (!this.globalBucketIndex.has(bucket.bucketId)) {
                    this.globalBucketIndex.set(bucket.bucketId, []);
                }
                
                this.globalBucketIndex.get(bucket.bucketId).push({
                    repo: repoName,
                    fileIndex: idx,
                    filePath: fp.filePath
                });
            });
        });

        return {
            repo: repoName,
            filesIndexed: fingerprints.length,
            functionsIndexed: fingerprints.reduce((sum, fp) => sum + fp.functions.length, 0)
        };
    }

    /**
     * Find cross-repository duplicates
     */
    findCrossRepoDuplicates(threshold = 0.75) {
        const matches = [];
        const processed = new Set();

        // Find candidates in same buckets across different repos
        this.globalBucketIndex.forEach((items, bucketId) => {
            if (items.length < 2) return;

            // Group by repo
            const repoGroups = new Map();
            items.forEach(item => {
                if (!repoGroups.has(item.repo)) {
                    repoGroups.set(item.repo, []);
                }
                repoGroups.get(item.repo).push(item);
            });

            // Only consider if multiple repos share this bucket
            if (repoGroups.size < 2) return;

            // Compare across repos
            const repos = Array.from(repoGroups.keys());
            for (let i = 0; i < repos.length; i++) {
                for (let j = i + 1; j < repos.length; j++) {
                    const repo1Items = repoGroups.get(repos[i]);
                    const repo2Items = repoGroups.get(repos[j]);

                    repo1Items.forEach(item1 => {
                        repo2Items.forEach(item2 => {
                            const pairKey = `${item1.repo}:${item1.filePath}|${item2.repo}:${item2.filePath}`;
                            if (processed.has(pairKey)) return;
                            processed.add(pairKey);

                            const fp1 = this.repoIndex.get(item1.repo).fingerprints[item1.fileIndex];
                            const fp2 = this.repoIndex.get(item2.repo).fingerprints[item2.fileIndex];

                            const similarity = astFingerprintService.calculateJaccardSimilarity(
                                fp1.minHashSignature,
                                fp2.minHashSignature
                            );

                            if (similarity >= threshold) {
                                matches.push({
                                    repo1: item1.repo,
                                    file1: item1.filePath,
                                    repo2: item2.repo,
                                    file2: item2.filePath,
                                    similarity: parseFloat((similarity * 100).toFixed(2)),
                                    type: similarity >= 0.95 ? 'exact-duplicate' : 
                                          similarity >= 0.85 ? 'near-duplicate' : 'similar',
                                    features1: fp1.features,
                                    features2: fp2.features,
                                    functions1: fp1.functions.length,
                                    functions2: fp2.functions.length
                                });
                            }
                        });
                    });
                }
            }
        });

        // Sort by similarity
        matches.sort((a, b) => b.similarity - a.similarity);
        this.crossRepoMatches = matches;
        
        return matches;
    }

    /**
     * Find function-level duplicates across repos
     */
    findCrossRepoFunctionDuplicates(threshold = 0.80) {
        const functionMatches = [];
        const allFunctions = [];

        // Collect all functions from all repos
        this.repoIndex.forEach((repoData, repoName) => {
            repoData.fingerprints.forEach(fp => {
                fp.functions.forEach(func => {
                    // Generate fingerprint for individual function
                    const funcFingerprint = this.generateFunctionFingerprint(func.code);
                    
                    allFunctions.push({
                        repo: repoName,
                        file: fp.filePath,
                        name: func.name,
                        type: func.type,
                        code: func.code,
                        signature: funcFingerprint.signature,
                        complexity: funcFingerprint.complexity
                    });
                });
            });
        });

        // Compare functions across repos
        for (let i = 0; i < allFunctions.length; i++) {
            for (let j = i + 1; j < allFunctions.length; j++) {
                const func1 = allFunctions[i];
                const func2 = allFunctions[j];

                // Skip if same repo
                if (func1.repo === func2.repo) continue;

                const similarity = this.compareFunctionSignatures(
                    func1.signature,
                    func2.signature
                );

                if (similarity >= threshold) {
                    functionMatches.push({
                        function1: {
                            repo: func1.repo,
                            file: func1.file,
                            name: func1.name,
                            type: func1.type,
                            complexity: func1.complexity
                        },
                        function2: {
                            repo: func2.repo,
                            file: func2.file,
                            name: func2.name,
                            type: func2.type,
                            complexity: func2.complexity
                        },
                        similarity: parseFloat((similarity * 100).toFixed(2)),
                        recommendation: this.generateRefactoringRecommendation(func1, func2)
                    });
                }
            }
        }

        return functionMatches.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Generate function fingerprint
     */
    generateFunctionFingerprint(code) {
        const parseResult = astFingerprintService.parseCode(code);
        
        if (parseResult.error) {
            return { signature: [], complexity: 0 };
        }

        const features = astFingerprintService.extractStructuralFeatures(parseResult.ast);
        const signature = astFingerprintService.generateMinHashSignature(features);

        return {
            signature,
            complexity: features.complexity
        };
    }

    /**
     * Compare function signatures
     */
    compareFunctionSignatures(sig1, sig2) {
        return astFingerprintService.calculateJaccardSimilarity(sig1, sig2);
    }

    /**
     * Generate refactoring recommendation
     */
    generateRefactoringRecommendation(func1, func2) {
        return {
            action: 'extract-to-shared-library',
            targetLibrary: 'common-utils',
            suggestedName: `${func1.name}_shared`,
            reasoning: `Function appears in ${func1.repo} and ${func2.repo} with ${
                func1.complexity > 5 ? 'high' : 'moderate'
            } complexity. Consider extracting to shared utility library.`,
            estimatedSavings: {
                linesOfCode: func1.code?.split('\n').length || 0,
                maintenanceEffort: 'Medium'
            }
        };
    }

    /**
     * Analyze "reinventing the wheel" patterns
     */
    analyzeReinventionPatterns() {
        const patterns = {
            commonPatterns: [],
            frequentDuplicates: [],
            recommendedExtractions: []
        };

        // Group similar code by pattern
        const patternGroups = new Map();

        this.crossRepoMatches.forEach(match => {
            const key = `complexity:${match.features1.complexity}|funcs:${match.functions1}`;
            
            if (!patternGroups.has(key)) {
                patternGroups.set(key, []);
            }
            
            patternGroups.get(key).push(match);
        });

        // Identify most common patterns
        patternGroups.forEach((matches, pattern) => {
            if (matches.length >= 3) { // Pattern appears in 3+ places
                patterns.commonPatterns.push({
                    pattern,
                    occurrences: matches.length,
                    repos: [...new Set(matches.flatMap(m => [m.repo1, m.repo2]))],
                    avgSimilarity: matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length,
                    examples: matches.slice(0, 3).map(m => ({
                        repo1: m.repo1,
                        file1: m.file1,
                        repo2: m.repo2,
                        file2: m.file2
                    }))
                });
            }
        });

        // Sort by occurrences
        patterns.commonPatterns.sort((a, b) => b.occurrences - a.occurrences);

        // Generate extraction recommendations
        patterns.commonPatterns.slice(0, 10).forEach((pattern, idx) => {
            patterns.recommendedExtractions.push({
                priority: idx + 1,
                pattern: pattern.pattern,
                affectedRepos: pattern.repos,
                occurrences: pattern.occurrences,
                suggestedLibrary: `shared-${idx + 1}`,
                estimatedImpact: {
                    codeReduction: `${(pattern.occurrences * 20).toFixed(0)} lines`,
                    maintenanceImprovement: 'High',
                    reusabilityScore: Math.min(95, 60 + pattern.occurrences * 5)
                }
            });
        });

        return patterns;
    }

    /**
     * Generate cross-repo similarity map data
     */
    generateSimilarityMap() {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        // Create nodes for each file
        this.repoIndex.forEach((repoData, repoName) => {
            repoData.fingerprints.forEach((fp, idx) => {
                const nodeId = `${repoName}:${fp.filePath}`;
                
                nodeMap.set(nodeId, nodes.length);
                
                nodes.push({
                    id: nodeId,
                    repo: repoName,
                    file: path.basename(fp.filePath),
                    fullPath: fp.filePath,
                    complexity: fp.features.complexity,
                    functions: fp.features.functionCount,
                    size: fp.metadata.linesOfCode,
                    group: this.getRepoGroupId(repoName)
                });
            });
        });

        // Create links for similar code
        this.crossRepoMatches.forEach(match => {
            const sourceId = `${match.repo1}:${match.file1}`;
            const targetId = `${match.repo2}:${match.file2}`;
            
            const sourceIdx = nodeMap.get(sourceId);
            const targetIdx = nodeMap.get(targetId);
            
            if (sourceIdx !== undefined && targetIdx !== undefined) {
                links.push({
                    source: sourceIdx,
                    target: targetIdx,
                    value: match.similarity,
                    type: match.type
                });
            }
        });

        return { nodes, links };
    }

    /**
     * Get repo group ID for visualization
     */
    getRepoGroupId(repoName) {
        const hash = repoName.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        return Math.abs(hash) % 12; // 12 color groups
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const totalRepos = this.repoIndex.size;
        const totalFiles = Array.from(this.repoIndex.values())
            .reduce((sum, repo) => sum + repo.fileCount, 0);
        
        const duplicatePairs = this.crossRepoMatches.filter(m => m.type === 'exact-duplicate').length;
        const nearDuplicates = this.crossRepoMatches.filter(m => m.type === 'near-duplicate').length;
        const similar = this.crossRepoMatches.filter(m => m.type === 'similar').length;

        const patterns = this.analyzeReinventionPatterns();

        return {
            summary: {
                totalRepositories: totalRepos,
                totalFilesAnalyzed: totalFiles,
                crossRepoDuplicates: {
                    exact: duplicatePairs,
                    near: nearDuplicates,
                    similar: similar,
                    total: this.crossRepoMatches.length
                }
            },
            repositories: Array.from(this.repoIndex.entries()).map(([name, data]) => ({
                name,
                filesIndexed: data.fileCount,
                indexedAt: data.indexedAt
            })),
            topMatches: this.crossRepoMatches.slice(0, 20),
            reinventionPatterns: patterns,
            similarityMap: this.generateSimilarityMap(),
            recommendations: this.generateRecommendations(patterns)
        };
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(patterns) {
        const recommendations = [];

        // High priority: exact duplicates
        const exactDuplicates = this.crossRepoMatches.filter(m => m.similarity >= 95);
        if (exactDuplicates.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Exact Duplication',
                issue: `Found ${exactDuplicates.length} exact duplicates across repositories`,
                action: 'Immediately extract common code into shared libraries',
                impact: 'High maintenance burden, bug propagation risk',
                examples: exactDuplicates.slice(0, 3)
            });
        }

        // Medium priority: common patterns
        if (patterns.commonPatterns.length > 0) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Common Patterns',
                issue: `Identified ${patterns.commonPatterns.length} frequently repeated patterns`,
                action: 'Consider creating reusable components/utilities',
                impact: 'Moderate code bloat, inconsistent implementations',
                examples: patterns.commonPatterns.slice(0, 3)
            });
        }

        // Low priority: similar code
        const similarCode = this.crossRepoMatches.filter(m => m.similarity >= 70 && m.similarity < 85);
        if (similarCode.length > 0) {
            recommendations.push({
                priority: 'LOW',
                category: 'Similar Logic',
                issue: `Found ${similarCode.length} similar code patterns`,
                action: 'Review for potential consolidation opportunities',
                impact: 'Minor maintenance overhead',
                count: similarCode.length
            });
        }

        return recommendations;
    }

    /**
     * Clear index
     */
    clearIndex() {
        this.repoIndex.clear();
        this.globalBucketIndex.clear();
        this.crossRepoMatches = [];
    }
}

module.exports = new CrossRepoLogicMapper();
