/**
 * Diff Controller
 * Generates side-by-side diff JSON for comparing original vs refactored code
 */

const diff = require('diff');
const RefactorService = require('../services/refactor.service');

class DiffController {
    /**
     * Generates side-by-side diff for a refactoring patch
     */
    async getDiff(req, res) {
        try {
            const { filePath, patchId } = req.query;

            if (!filePath) {
                return res.status(400).json({ error: 'filePath parameter required' });
            }

            // In a real implementation, you'd fetch the patch by ID
            // For now, we'll generate a mock diff
            const diffData = await this.generateMockDiff(filePath);

            res.json(diffData);
        } catch (error) {
            console.error('Error generating diff:', error);
            res.status(500).json({ error: 'Failed to generate diff' });
        }
    }

    /**
     * Generates diff for a specific refactoring patch
     */
    async getPatchDiff(req, res) {
        try {
            const { patchId } = req.params;

            // Mock patch data - in real implementation, fetch from database/storage
            const patch = this.getMockPatch(patchId);
            if (!patch) {
                return res.status(404).json({ error: 'Patch not found' });
            }

            const diffData = this.parsePatchToDiff(patch);
            res.json(diffData);
        } catch (error) {
            console.error('Error generating patch diff:', error);
            res.status(500).json({ error: 'Failed to generate patch diff' });
        }
    }

    /**
     * Generates side-by-side diff JSON from patch content
     */
    parsePatchToDiff(patch) {
        const lines = patch.patch.split('\n');
        const diffLines = [];

        let leftLineNumber = 0;
        let rightLineNumber = 0;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                // Header line with line numbers
                const match = line.match(/@@ -(\d+),\d+ \+(\d+),\d+ @@/);
                if (match) {
                    leftLineNumber = parseInt(match[1]) - 1;
                    rightLineNumber = parseInt(match[2]) - 1;
                }
                continue;
            }

            if (line.startsWith(' ')) {
                // Context line (unchanged)
                leftLineNumber++;
                rightLineNumber++;
                diffLines.push({
                    type: 'context',
                    left: { lineNumber: leftLineNumber, content: line.substring(1) },
                    right: { lineNumber: rightLineNumber, content: line.substring(1) }
                });
            } else if (line.startsWith('-')) {
                // Removed line
                leftLineNumber++;
                diffLines.push({
                    type: 'delete',
                    left: { lineNumber: leftLineNumber, content: line.substring(1) },
                    right: null
                });
            } else if (line.startsWith('+')) {
                // Added line
                rightLineNumber++;
                diffLines.push({
                    type: 'add',
                    left: null,
                    right: { lineNumber: rightLineNumber, content: line.substring(1) }
                });
            }
        }

        return {
            filePath: patch.filePath,
            description: patch.description,
            type: patch.type,
            severity: patch.severity,
            lines: diffLines,
            stats: {
                additions: diffLines.filter(l => l.type === 'add').length,
                deletions: diffLines.filter(l => l.type === 'delete').length,
                changes: diffLines.filter(l => l.type !== 'context').length
            }
        };
    }

    /**
     * Generates mock diff data for demonstration
     */
    async generateMockDiff(filePath) {
        const mockOriginal = `function complexFunction(param1, param2, param3) {
    let result = 0;

    // Complex logic block 1
    if (param1 > 10) {
        for (let i = 0; i < param1; i++) {
            result += i * param2;
            if (result > 100) {
                result = result / 2;
            }
        }
    }

    // Complex logic block 2
    if (param2 < 5) {
        while (result < 50) {
            result += param3;
            param3++;
        }
    }

    return result;
}`;

        const mockRefactored = `function calculateBaseResult(param1, param2) {
    let result = 0;
    if (param1 > 10) {
        for (let i = 0; i < param1; i++) {
            result += i * param2;
            if (result > 100) {
                result = result / 2;
            }
        }
    }
    return result;
}

function adjustResult(result, param2, param3) {
    if (param2 < 5) {
        while (result < 50) {
            result += param3;
            param3++;
        }
    }
    return result;
}

function complexFunction(param1, param2, param3) {
    let result = calculateBaseResult(param1, param2);
    result = adjustResult(result, param2, param3);
    return result;
}`;

        const patch = diff.createPatch(filePath, mockOriginal, mockRefactored, 'original', 'refactored');

        return this.parsePatchToDiff({
            filePath,
            description: 'Extract complex logic into smaller, focused functions',
            type: 'extract_function',
            severity: 'major',
            patch
        });
    }

    /**
     * Mock patch retrieval - in real implementation, fetch from storage
     */
    getMockPatch(patchId) {
        // Mock patches for demonstration
        const patches = [
            {
                id: '1',
                filePath: 'src/utils/helpers.js',
                description: 'Extract validation logic into separate function',
                type: 'extract_function',
                severity: 'major',
                patch: `--- a/src/utils/helpers.js
+++ b/src/utils/helpers.js
@@ -10,15 +10,8 @@ function processUserData(userData) {
     // Validate input
-    if (!userData.name || userData.name.length < 2) {
-        throw new Error('Invalid name');
-    }
-    if (!userData.email || !userData.email.includes('@')) {
-        throw new Error('Invalid email');
-    }
-    if (userData.age && (userData.age < 0 || userData.age > 150)) {
-        throw new Error('Invalid age');
-    }
+    validateUserData(userData);
 
     // Process data
     return {
@@ -25,3 +18,14 @@ function processUserData(userData) {
     };
 }
+
+function validateUserData(userData) {
+    if (!userData.name || userData.name.length < 2) {
+        throw new Error('Invalid name');
+    }
+    if (!userData.email || !userData.email.includes('@')) {
+        throw new Error('Invalid email');
+    }
+    if (userData.age && (userData.age < 0 || userData.age > 150)) {
+        throw new Error('Invalid age');
+    }
+}`
            }
        ];

        return patches.find(p => p.id === patchId);
    }

    /**
     * Applies a refactoring patch to GitHub repository
     */
    async applyPatch(req, res) {
        try {
            const { patchId, repoOwner, repoName, baseBranch = 'main' } = req.body;

            if (!patchId || !repoOwner || !repoName) {
                return res.status(400).json({
                    error: 'patchId, repoOwner, and repoName are required'
                });
            }

            const patch = this.getMockPatch(patchId);
            if (!patch) {
                return res.status(404).json({ error: 'Patch not found' });
            }

            // Apply the refactoring patch via GitHub API
            const result = await GithubRefactorService.applyRefactoringPatch(
                repoOwner,
                repoName,
                patch,
                baseBranch
            );

            res.json({
                success: true,
                message: 'Refactoring patch applied successfully',
                branchName: result.branchName,
                commitSha: result.commitSha,
                prNumber: result.prNumber,
                prUrl: result.prUrl
            });
        } catch (error) {
            console.error('Error applying patch:', error);
            res.status(500).json({
                error: 'Failed to apply patch',
                details: error.message
            });
        }
    }
}

module.exports = new DiffController();
