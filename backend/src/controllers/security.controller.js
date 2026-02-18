/**
 * XAYTHEON - Security Controller
 * 
 * Manages security analysis, fuzzing triggering, and threat history retrieval.
 */

const securityAnalyzer = require('../services/security-analyzer.service');
const fuzzerEngine = require('../services/fuzzer.engine');

/**
 * Start predictive security analysis
 * POST /api/security/analyze
 */
exports.runAnalysis = async (req, res) => {
    try {
        const { context = {} } = req.body;
        const threats = await securityAnalyzer.analyze(context);

        res.json({
            success: true,
            threatsFound: threats.length,
            data: threats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Security analysis failed." });
    }
};

/**
 * Manually trigger fuzzing engine
 * POST /api/security/fuzz
 */
exports.triggerFuzz = async (req, res) => {
    try {
        const { targetUrl } = req.body;
        if (!targetUrl) return res.status(400).json({ success: false, message: "Target URL required." });

        const results = await securityAnalyzer.triggerAutomatedScan(targetUrl);

        res.json({
            success: true,
            message: `Fuzzing completed. ${results.length || 0} vulnerabilities identified.`,
            vulnerabilities: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Fuzzing execution failed." });
    }
};

/**
 * Get full threat history
 * GET /api/security/threats
 */
exports.getHistory = (req, res) => {
    try {
        const history = securityAnalyzer.getThreatHistory();
        res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error retrieving threat logs." });
    }
};

/**
 * Get global security status
 * GET /api/security/status
 */
exports.getStatus = (req, res) => {
    try {
        const status = securityAnalyzer.getStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error retrieving status." });
    }
};
