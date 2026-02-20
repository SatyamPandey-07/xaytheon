/**
 * XAYTHEON - Compliance & Audit Controller
 * 
 * Handles API interactions for governance auditing, report generation, 
 * and compliance history retrieval.
 */

const complianceService = require('../services/compliance.service');
const reportGenerator = require('../services/report-generator.service');

/**
 * Start a new compliance audit
 * POST /api/audit/run
 */
exports.runAudit = async (req, res) => {
    try {
        const { repoPath, frameworks } = req.body;

        if (!repoPath) {
            return res.status(400).json({
                success: false,
                message: "Repository path (repoPath) is required for auditing."
            });
        }

        // Run the audit
        const auditResult = await complianceService.performAudit(repoPath, frameworks);

        res.json({
            success: true,
            message: `Audit completed with score: ${auditResult.overallScore}`,
            data: auditResult
        });
    } catch (error) {
        console.error("Audit Controller Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to execute compliance audit.",
            error: error.message
        });
    }
};

/**
 * Generate a formatted report from a previous audit
 * GET /api/audit/report/:auditId
 */
exports.getReport = async (req, res) => {
    try {
        const { auditId } = req.params;
        const { format = 'json', template = 'EXECUTIVE' } = req.query;

        const history = complianceService.getAuditHistory();
        const auditData = history.find(a => a.auditId === auditId);

        if (!auditData) {
            return res.status(404).json({
                success: false,
                message: `Audit with ID ${auditId} not found in historical records.`
            });
        }

        const report = reportGenerator.generateReport(auditData, format, template);

        if (format === 'markdown' || format === 'html') {
            res.setHeader('Content-Type', format === 'markdown' ? 'text/markdown' : 'text/html');
            return res.send(report);
        }

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error("Report Generation Error:", error);
        res.status(500).json({
            success: false,
            message: "Error generating compliance report."
        });
    }
};

/**
 * Get all available frameworks and controls
 * GET /api/audit/frameworks
 */
exports.listFrameworks = (req, res) => {
    try {
        const frameworks = complianceService.getFrameworks();
        res.json({
            success: true,
            data: frameworks
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error retrieving frameworks." });
    }
};

/**
 * Get historical audit summaries
 * GET /api/audit/history
 */
exports.getAuditHistory = (req, res) => {
    try {
        const history = complianceService.getAuditHistory();
        res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error retrieving audit history." });
    }
};

/**
 * Download report as a physical file (Mock)
 * GET /api/audit/report/:auditId/download
 */
exports.downloadReport = async (req, res) => {
    try {
        const { auditId } = req.params;
        const history = complianceService.getAuditHistory();
        const auditData = history.find(a => a.auditId === auditId);

        if (!auditData) return res.status(404).send("Report not found");

        const mdContent = reportGenerator.generateReport(auditData, 'markdown');

        res.setHeader('Content-Disposition', `attachment; filename=report_${auditId}.md`);
        res.send(mdContent);
    } catch (error) {
        res.status(500).send("Download failed.");
    }
};
