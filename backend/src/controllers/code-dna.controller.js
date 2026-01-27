/**
 * Code DNA Controller
 * Handles structural code duplication and plagiarism detection
 */

const astFingerprintService = require('../services/ast-fingerprint.service');
const crossRepoMapper = require('../services/cross-repo-mapper.service');
const libraryExtractionService = require('../services/library-extraction.service');

class CodeDNAController {
    /**
     * Analyze single repository for duplicates
     */
    async analyzeRepository(req, res) {
        try {
            const { repositoryPath, threshold } = req.body;

            if (!repositoryPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Repository path is required'
                });
            }

            // Analyze directory
            const fingerprints = await astFingerprintService.analyzeDirectory(repositoryPath);

            if (fingerprints.length === 0) {
                return res.json({
                    success: true,
                    message: 'No analyzable files found',
                    data: {
                        fingerprints: [],
                        duplicates: [],
                        statistics: {}
                    }
                });
            }

            // Find similar code
            const similarPairs = astFingerprintService.findSimilarCode(
                fingerprints,
                threshold || 0.7
            );

            // Generate statistics
            const statistics = astFingerprintService.generateStatistics(
                fingerprints,
                similarPairs
            );

            res.json({
                success: true,
                data: {
                    fingerprints: fingerprints.map(fp => ({
                        file: fp.filePath,
                        hash: fp.structuralHash,
                        features: fp.features,
                        functions: fp.functions.length
                    })),
                    duplicates: similarPairs,
                    statistics
                }
            });
        } catch (error) {
            console.error('Repository analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Analyze code snippet
     */
    async analyzeSnippet(req, res) {
        try {
            const { code, fileName } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Code is required'
                });
            }

            const fingerprint = await astFingerprintService.generateFingerprint(
                code,
                fileName || 'snippet.js'
            );

            res.json({
                success: fingerprint.success,
                data: fingerprint
            });
        } catch (error) {
            console.error('Snippet analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Compare two code snippets
     */
    async compareSnippets(req, res) {
        try {
            const { code1, code2 } = req.body;

            if (!code1 || !code2) {
                return res.status(400).json({
                    success: false,
                    error: 'Both code snippets are required'
                });
            }

            const fp1 = await astFingerprintService.generateFingerprint(code1, 'snippet1.js');
            const fp2 = await astFingerprintService.generateFingerprint(code2, 'snippet2.js');

            if (!fp1.success || !fp2.success) {
                return res.status(400).json({
                    success: false,
                    error: 'Failed to parse code snippets',
                    errors: {
                        snippet1: fp1.error,
                        snippet2: fp2.error
                    }
                });
            }

            const similarity = astFingerprintService.calculateJaccardSimilarity(
                fp1.minHashSignature,
                fp2.minHashSignature
            );

            res.json({
                success: true,
                data: {
                    similarity: parseFloat((similarity * 100).toFixed(2)),
                    verdict: similarity >= 0.9 ? 'Highly Similar / Duplicate' :
                             similarity >= 0.7 ? 'Similar' :
                             similarity >= 0.5 ? 'Somewhat Similar' :
                             'Different',
                    fingerprint1: {
                        hash: fp1.structuralHash,
                        features: fp1.features
                    },
                    fingerprint2: {
                        hash: fp2.structuralHash,
                        features: fp2.features
                    }
                }
            });
        } catch (error) {
            console.error('Comparison error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Index multiple repositories for cross-repo analysis
     */
    async indexRepositories(req, res) {
        try {
            const { repositories } = req.body;

            if (!Array.isArray(repositories) || repositories.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Array of repositories is required'
                });
            }

            // Clear existing index
            crossRepoMapper.clearIndex();

            const indexResults = [];

            for (const repo of repositories) {
                if (!repo.path || !repo.name) {
                    continue;
                }

                try {
                    const result = await crossRepoMapper.indexRepository(
                        repo.path,
                        repo.name
                    );
                    indexResults.push(result);
                } catch (error) {
                    indexResults.push({
                        repo: repo.name,
                        error: error.message
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    indexedRepositories: indexResults,
                    total: indexResults.length
                }
            });
        } catch (error) {
            console.error('Indexing error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Find cross-repository duplicates
     */
    async findCrossRepoDuplicates(req, res) {
        try {
            const { threshold } = req.body;

            const duplicates = crossRepoMapper.findCrossRepoDuplicates(threshold || 0.75);
            const functionDuplicates = crossRepoMapper.findCrossRepoFunctionDuplicates(0.80);
            const report = crossRepoMapper.generateReport();

            res.json({
                success: true,
                data: {
                    fileDuplicates: duplicates,
                    functionDuplicates,
                    report
                }
            });
        } catch (error) {
            console.error('Cross-repo analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get similarity visualization data
     */
    async getSimilarityMap(req, res) {
        try {
            const similarityMap = crossRepoMapper.generateSimilarityMap();

            res.json({
                success: true,
                data: similarityMap
            });
        } catch (error) {
            console.error('Similarity map error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get library extraction suggestions
     */
    async getLibraryExtractions(req, res) {
        try {
            const { repositoryPath, threshold } = req.body;

            if (!repositoryPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Repository path is required'
                });
            }

            // Analyze repository
            const fingerprints = await astFingerprintService.analyzeDirectory(repositoryPath);
            const similarPairs = astFingerprintService.findSimilarCode(
                fingerprints,
                threshold || 0.7
            );

            // Generate extraction suggestions
            const suggestions = libraryExtractionService.suggestLibraryExtractions(
                fingerprints,
                similarPairs
            );

            const summary = libraryExtractionService.generateSummary(suggestions);

            res.json({
                success: true,
                data: {
                    suggestions,
                    summary
                }
            });
        } catch (error) {
            console.error('Extraction suggestions error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get detailed extraction plan for a suggestion
     */
    async getExtractionPlan(req, res) {
        try {
            const { suggestionId, repositoryPath } = req.body;

            if (!suggestionId || !repositoryPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Suggestion ID and repository path are required'
                });
            }

            // Re-analyze to get the suggestion
            const fingerprints = await astFingerprintService.analyzeDirectory(repositoryPath);
            const similarPairs = astFingerprintService.findSimilarCode(fingerprints, 0.7);
            const suggestions = libraryExtractionService.suggestLibraryExtractions(
                fingerprints,
                similarPairs
            );

            const suggestion = suggestions.find(s => s.id === suggestionId);

            if (!suggestion) {
                return res.status(404).json({
                    success: false,
                    error: 'Suggestion not found'
                });
            }

            res.json({
                success: true,
                data: {
                    plan: suggestion.extractionPlan,
                    impact: suggestion.impact,
                    recommendation: suggestion.recommendation
                }
            });
        } catch (error) {
            console.error('Extraction plan error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Analyze reinvention patterns
     */
    async analyzeReinventionPatterns(req, res) {
        try {
            const patterns = crossRepoMapper.analyzeReinventionPatterns();

            res.json({
                success: true,
                data: patterns
            });
        } catch (error) {
            console.error('Pattern analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Generate comprehensive duplication report
     */
    async generateReport(req, res) {
        try {
            const { repositoryPath, includeExtraction, threshold } = req.body;

            if (!repositoryPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Repository path is required'
                });
            }

            // Analyze repository
            const fingerprints = await astFingerprintService.analyzeDirectory(repositoryPath);
            const similarPairs = astFingerprintService.findSimilarCode(
                fingerprints,
                threshold || 0.7
            );
            const statistics = astFingerprintService.generateStatistics(
                fingerprints,
                similarPairs
            );

            const report = {
                summary: statistics,
                duplicates: {
                    exact: similarPairs.filter(p => p.similarity >= 95),
                    near: similarPairs.filter(p => p.similarity >= 85 && p.similarity < 95),
                    similar: similarPairs.filter(p => p.similarity >= 70 && p.similarity < 85)
                },
                topDuplicates: similarPairs.slice(0, 10)
            };

            if (includeExtraction) {
                const suggestions = libraryExtractionService.suggestLibraryExtractions(
                    fingerprints,
                    similarPairs
                );
                const extractionSummary = libraryExtractionService.generateSummary(suggestions);

                report.extraction = {
                    suggestions: suggestions.slice(0, 5),
                    summary: extractionSummary
                };
            }

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error('Report generation error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new CodeDNAController();
