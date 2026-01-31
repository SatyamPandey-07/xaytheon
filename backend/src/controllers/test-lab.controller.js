const testGen = require('../services/test-gen.service');
const mapper = require('../services/coverage-mapper.service');

exports.analyzeCode = async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) return res.status(400).json({ message: "File path is required" });

        const branches = await testGen.analyzeBranches(filePath);
        const logicTree = await mapper.mapLogicTree(filePath, branches);

        res.json({
            success: true,
            data: {
                branches,
                logicTree
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.generateTests = async (req, res) => {
    try {
        const { filePath, branches } = req.body;
        const testSuite = await testGen.generateTestSuite(filePath, branches);

        res.json({
            success: true,
            data: testSuite
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
