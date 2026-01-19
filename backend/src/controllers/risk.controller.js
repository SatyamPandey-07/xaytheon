const riskService = require('../services/risk-detector.service');

exports.getAnalysis = async (req, res) => {
    try {
        const { repo } = req.query;
        if (!repo) return res.status(400).json({ message: "Repo is required" });

        const data = await riskService.analyzeConflicts(repo);
        res.json(data);
    } catch (error) {
        console.error("Risk Analysis Error:", error);
        res.status(500).json({ message: "Failed to perform risk analysis" });
    }
};
