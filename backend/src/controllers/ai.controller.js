const llmService = require('../services/llm.service');
const buildMonitor = require('../services/build-monitor.service');

exports.chat = async (req, res) => {
    try {
        const { query, repoContext } = req.body;

        if (!query) {
            return res.status(400).json({ message: "Query is required" });
        }

        // In a real RAG implementation, we would search/index the repo metadata here
        const context = repoContext || "README: XAYTHEON - Open Source Analytics";
        const response = await llmService.generateResponse(query, context);

        res.json({ response });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ message: "AI Assistant is currently offline." });
    }
};

exports.summarize = async (req, res) => {
    try {
        const { repo } = req.query;
        // Mocking fetching README content
        const context = `Repository: ${repo}. Features: Heatmap, Sentiment, Collaboration.`;
        const summary = await llmService.getSummary(context);

        res.json({ summary });
    } catch (error) {
        console.error("AI Summary Error:", error);
        res.status(500).json({ message: "Failed to generate summary." });
    }
};

/**
 * SELF-HEALING CI/CD ENDPOINTS
 */

/**
 * Get remediation suggestion for a failed build
 */
exports.getRemediation = async (req, res) => {
    try {
        const { buildId } = req.params;

        const remediation = buildMonitor.getRemediation(buildId);

        if (!remediation) {
            return res.status(404).json({
                success: false,
                message: "No remediation found for this build"
            });
        }

        res.json({
            success: true,
            data: remediation
        });
    } catch (error) {
        console.error("Get Remediation Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve remediation"
        });
    }
};

/**
 * Apply auto-fix patch to a temporary branch
 */
exports.applyPatch = async (req, res) => {
    try {
        const { buildId } = req.params;
        const { createPR = false } = req.body;

        const remediation = buildMonitor.getRemediation(buildId);

        if (!remediation) {
            return res.status(404).json({
                success: false,
                message: "No remediation found for this build"
            });
        }

        // Simulate applying patch
        // In production, this would:
        // 1. Create a new branch
        // 2. Apply the patch/run the fix command
        // 3. Commit changes
        // 4. Optionally create a PR

        const result = {
            success: true,
            message: "Patch applied successfully",
            data: {
                buildId,
                remediationId: remediation.id,
                branch: remediation.suggestedBranch,
                patch: remediation.patch,
                confidence: remediation.confidence,
                appliedAt: new Date(),
                prCreated: createPR,
                prUrl: createPR ? `https://github.com/${remediation.repoName}/pull/123` : null
            }
        };

        // Mark as applied
        buildMonitor.markRemediationApplied(buildId);

        res.json(result);
    } catch (error) {
        console.error("Apply Patch Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to apply patch"
        });
    }
};

/**
 * Simulate a build failure for testing
 */
exports.simulateBuildFailure = async (req, res) => {
    try {
        const { repoName, errorType = 'lint' } = req.body;

        // Mock build logs for different error types
        const mockLogs = {
            lint: `
npm run lint

> xaytheon@1.0.0 lint
> eslint .

/src/components/Dashboard.js
  12:5  error  'useState' is not defined  no-undef
  15:3  error  Missing semicolon          semi
  23:1  error  Unexpected console statement  no-console

✖ 3 problems (3 errors, 0 warnings)
  2 errors and 0 warnings potentially fixable with the \`--fix\` option.
            `,
            dependency: `
npm run build

Error: Cannot find module 'express'
Require stack:
- /app/backend/src/server.js
- /app/backend/index.js
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:815:15)
    at Function.Module._load (internal/modules/cjs/loader.js:667:27)
            `,
            test: `
npm test

FAIL  src/utils/helper.test.js
  ● calculateScore › should return correct score

    expect(received).toBe(expected) // Object.is equality

    Expected: 85
    Received: 80

      12 |     const result = calculateScore(data);
      13 |     expect(result).toBe(85);
         |                    ^
      14 |   });

Test Suites: 1 failed, 5 passed, 6 total
Tests:       1 failed, 12 passed, 13 total
            `,
            syntax: `
npm run build

/src/app.js:45
  const result = await fetchData()
                 ^^^^^

SyntaxError: Unexpected token 'await'
    at Module._compile (internal/modules/cjs/loader.js:723:23)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:789:10)
            `
        };

        const logs = mockLogs[errorType] || mockLogs.lint;

        const buildData = {
            buildId: `build_${Date.now()}`,
            status: 'failure',
            logs,
            branch: 'main',
            commit: 'abc123'
        };

        const result = await buildMonitor.handleBuildUpdate(repoName, buildData);

        res.json({
            success: true,
            message: "Build failure simulated",
            data: result
        });
    } catch (error) {
        console.error("Simulate Build Failure Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to simulate build failure"
        });
    }
};
