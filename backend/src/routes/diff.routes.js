/**
 * Diff Routes
 * API endpoints for generating and viewing code diffs
 */

const express = require('express');
const router = express.Router();
const DiffController = require('../controllers/diff.controller');

/**
 * GET /api/diff/view
 * Generate side-by-side diff for a file or patch
 */
router.get('/view', DiffController.getDiff);

/**
 * GET /api/diff/patch/:patchId
 * Get diff for a specific refactoring patch
 */
router.get('/patch/:patchId', DiffController.getPatchDiff);

/**
 * POST /api/diff/apply
 * Apply a diff patch to the repository
 */
router.post('/apply', DiffController.applyPatch);

/**
 * GET /api/diff/compare
 * Compare two versions of a file
 */
router.get('/compare', async (req, res) => {
    try {
        const { filePath, original, refactored } = req.query;

        if (!filePath || !original || !refactored) {
            return res.status(400).json({
                error: 'filePath, original, and refactored parameters required'
            });
        }

        // Generate diff between original and refactored versions
        const diff = require('diff');
        const patch = diff.createPatch(filePath, original, refactored, 'original', 'refactored');

        const diffData = DiffController.parsePatchToDiff({
            filePath,
            description: 'Custom comparison',
            type: 'comparison',
            severity: 'info',
            patch
        });

        res.json(diffData);
    } catch (error) {
        console.error('Error generating comparison diff:', error);
        res.status(500).json({ error: 'Failed to generate comparison diff' });
    }
});

module.exports = router;
