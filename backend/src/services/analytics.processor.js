const githubService = require('./github.service');
const analyticsModel = require('../models/analytics.model');

/**
 * Process the analytics job
 * This logic is extracted so it can be used by both the Worker (Redis) and the Fallback (Inline)
 */
exports.processAnalyticsJob = async ({ userId, githubUsername, jobId }) => {
    const logPrefix = jobId ? `[Worker @${jobId}]` : `[Inline-Fallback]`;
    console.log(`${logPrefix} Processing analytics for ${githubUsername} (User: ${userId})`);

    try {
        // 1. Fetch Data
        console.log(`${logPrefix} Fetching data from GitHub...`);
        const snapshotData = await githubService.getAnalyticsData(githubUsername);

        // 2. Store Snapshot
        console.log(`${logPrefix} Storing snapshot...`);
        const snapshotId = await analyticsModel.createSnapshot(
            userId,
            githubUsername,
            snapshotData
        );

        console.log(`${logPrefix} Completed! SnapshotID: ${snapshotId}`);
        return { snapshotId, ...snapshotData };
    } catch (error) {
        console.error(`${logPrefix} Failed:`, error.message);
        throw error;
    }
};
