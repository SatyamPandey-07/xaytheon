/**
 * Knowledge Map API Controller
 */

const expertiseService = require('../services/expertise-extraction.service');
const knowledgeGraphService = require('../services/knowledge-graph.service');
const siloDetectorService = require('../services/silo-detector.service');
const pairRecommenderService = require('../services/pair-recommender.service');

class KnowledgeMapController {
    /**
     * Get knowledge graph for repository
     */
    async getKnowledgeGraph(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const busFactor = siloDetectorService.calculateBusFactor(graph);

            // Add bus factor to metadata
            graph.metadata.busFactor = busFactor.repositoryBusFactor;
            graph.metadata.busFactorRisk = busFactor.risk;

            res.json({
                success: true,
                graph
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get knowledge silos
     */
    async getSilos(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const silos = siloDetectorService.detectSilos(graph);
            const busFactor = siloDetectorService.calculateBusFactor(graph);
            const heatMap = siloDetectorService.generateSiloHeatMap(graph);

            res.json({
                success: true,
                silos,
                busFactor,
                heatMap
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get team expertise
     */
    async getTeamExpertise(req, res) {
        try {
            const { owner, repo } = req.params;

            const teamExpertise = await expertiseService.analyzeTeamExpertise(owner, repo);

            res.json({
                success: true,
                teamExpertise
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get individual developer expertise
     */
    async getDeveloperExpertise(req, res) {
        try {
            const { owner, repo, username } = req.params;

            const expertise = await expertiseService.analyzeExpertise(owner, repo, username);

            res.json({
                success: true,
                expertise
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get pair programming recommendations for PR
     */
    async getPairRecommendations(req, res) {
        try {
            const { owner, repo } = req.params;
            const { author, files } = req.body;

            if (!author || !files || !Array.isArray(files)) {
                return res.status(400).json({
                    success: false,
                    error: 'Author and files array are required'
                });
            }

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const teamExpertise = await expertiseService.analyzeTeamExpertise(owner, repo);

            const recommendations = pairRecommenderService.recommendForPR(
                author,
                files,
                graph,
                teamExpertise
            );

            res.json({
                success: true,
                recommendations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get general pairing recommendations
     */
    async getGeneralPairings(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const silos = siloDetectorService.detectSilos(graph);
            const teamExpertise = await expertiseService.analyzeTeamExpertise(owner, repo);

            const pairings = pairRecommenderService.recommendGeneralPairing(
                graph,
                silos,
                teamExpertise
            );

            const schedule = pairRecommenderService.generatePairingSchedule(
                pairings.pairings,
                4
            );

            res.json({
                success: true,
                pairings,
                schedule
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get knowledge overlap between two developers
     */
    async getKnowledgeOverlap(req, res) {
        try {
            const { owner, repo, dev1, dev2 } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const overlap = knowledgeGraphService.findKnowledgeOverlap(graph, dev1, dev2);

            res.json({
                success: true,
                overlap
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get isolation scores
     */
    async getIsolationScores(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const isolationScores = knowledgeGraphService.calculateIsolationScores(graph);

            res.json({
                success: true,
                isolationScores
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get 3D visualization data
     */
    async get3DVisualization(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const nodes3D = knowledgeGraphService.generate3DCoordinates(graph);
            const silos = siloDetectorService.detectSilos(graph);

            res.json({
                success: true,
                nodes: nodes3D,
                edges: graph.edges,
                silos: silos.silos.map(s => s.path)
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get bus factor analysis
     */
    async getBusFactor(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const busFactor = siloDetectorService.calculateBusFactor(graph);

            res.json({
                success: true,
                busFactor
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get silo reduction plan
     */
    async getSiloReductionPlan(req, res) {
        try {
            const { owner, repo } = req.params;

            const graph = await knowledgeGraphService.buildKnowledgeGraph(owner, repo);
            const silos = siloDetectorService.detectSilos(graph);
            const plan = siloDetectorService.generateReductionPlan(silos, graph);

            res.json({
                success: true,
                plan
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get technology coverage
     */
    async getTechCoverage(req, res) {
        try {
            const { owner, repo } = req.params;

            const teamExpertise = await expertiseService.analyzeTeamExpertise(owner, repo);

            res.json({
                success: true,
                coverage: teamExpertise.techCoverage
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Find experts for technology
     */
    async findExperts(req, res) {
        try {
            const { owner, repo, technology } = req.params;

            const teamExpertise = await expertiseService.analyzeTeamExpertise(owner, repo);
            const experts = expertiseService.findExperts(teamExpertise.contributors, technology);

            res.json({
                success: true,
                technology,
                experts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Clear all caches
     */
    async clearCaches(req, res) {
        try {
            expertiseService.clearCache();
            knowledgeGraphService.clearCache();

            res.json({
                success: true,
                message: 'All caches cleared'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new KnowledgeMapController();
