const bundleService = require('../services/bundle-analyzer.service');
const pruningEngine = require('../services/pruning.engine');

exports.getBundleCity = async (req, res) => {
    try {
        const layout = await bundleService.generateCityLayout();
        const suggestions = await pruningEngine.getPruningSuggestions(layout.buildings);

        res.json({
            success: true,
            data: {
                layout,
                suggestions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.pruneBuilding = async (req, res) => {
    const { buildingId } = req.body;
    // Mock demolition logic
    res.json({
        success: true,
        message: `Building ${buildingId} marked for demolition and removal from next build.`
    });
};
