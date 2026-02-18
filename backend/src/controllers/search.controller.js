/**
 * XAYTHEON - Semantic Search Controller
 * 
 * Orchestrates smart discovery requests and graph relationship retrieval.
 */

const searchIntelligence = require('../services/search-intelligence.service');
const graphDB = require('../services/graph.db');

/**
 * Execute a Smart Semantic Search
 * GET /api/search/smart?q=query&lang=en
 */
exports.smartSearch = async (req, res) => {
    try {
        const { q, lang = 'en' } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Search query 'q' is required."
            });
        }

        const searchResults = await searchIntelligence.processQuery(q, lang);

        res.json({
            success: true,
            ...searchResults
        });
    } catch (error) {
        console.error("Semantic Search Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal error in semantic search engine.",
            error: error.message
        });
    }
};

/**
 * Get Relationship Graph for a specific module
 * GET /api/search/relationships/:nodeId
 */
exports.getNodeRelationships = async (req, res) => {
    try {
        const { nodeId } = req.params;
        const relationships = graphDB.findRelated(nodeId);

        res.json({
            success: true,
            nodeId,
            relationships
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error traversing knowledge graph." });
    }
};

/**
 * Get Graph Statistics
 * GET /api/search/graph-stats
 */
exports.getStats = async (req, res) => {
    try {
        const stats = graphDB.getGraphStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Could not retrieve graph metadata." });
    }
};
