const githubCompareService = require('../services/github-compare.service');

exports.compareRepos = async (req, res) => {
    try {
        const { repos } = req.query; // Expecting comma-separated list of reponames like "owner/repo1,owner/repo2"

        if (!repos) {
            return res.status(400).json({ message: 'At least one repository is required for comparison' });
        }

        const repoList = repos.split(',').map(r => r.trim()).filter(r => r.length > 0);

        if (repoList.length > 3) {
            return res.status(400).json({ message: 'Maximum 3 repositories can be compared at once' });
        }

        const comparisonData = await githubCompareService.compareRepositories(repoList);

        res.json(comparisonData);
    } catch (error) {
        console.error('Comparison error:', error);
        res.status(error.message.includes('not found') ? 404 : 500).json({
            message: error.message || 'Error comparing repositories'
        });
    }
};

exports.getTrendingForComparison = async (req, res) => {
    // Optional: Return some trending combinations or popular repos for comparison suggestions
    res.json([
        { name: 'threejs', fullName: 'mrdoob/three.js' },
        { name: 'react', fullName: 'facebook/react' },
        { name: 'vue', fullName: 'vuejs/core' }
    ]);
};
