/**
 * Analytics Scheduler Service
 * Handles periodic snapshot creation and data cleanup
 */

const analyticsModel = require("../models/analytics.model");

class AnalyticsScheduler {
    constructor() {
        this.snapshotInterval = null;
        this.cleanupInterval = null;
    }

    /**
     * Start the scheduler
     * @param {number} snapshotIntervalHours - Hours between snapshots (default: 24)
     * @param {number} cleanupIntervalDays - Days between cleanup runs (default: 7)
     */
    start(snapshotIntervalHours = 24, cleanupIntervalDays = 7) {
        console.log("📊 Starting Analytics Scheduler...");

        // Schedule periodic snapshots
        const snapshotMs = snapshotIntervalHours * 60 * 60 * 1000;
        this.snapshotInterval = setInterval(() => {
            this.performScheduledSnapshot();
        }, snapshotMs);

        // Schedule periodic cleanup
        const cleanupMs = cleanupIntervalDays * 24 * 60 * 60 * 1000;
        this.cleanupInterval = setInterval(() => {
            this.performScheduledCleanup();
        }, cleanupMs);

        console.log(
            `✅ Scheduler started: Snapshots every ${snapshotIntervalHours}h, Cleanup every ${cleanupIntervalDays}d`
        );
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        console.log("🛑 Analytics Scheduler stopped");
    }

    /**
     * Perform scheduled snapshot creation
     * Note: This is a placeholder. In production, you would:
     * 1. Get list of active users
     * 2. Fetch their GitHub data
     * 3. Create snapshots for each user
     */
    async performScheduledSnapshot() {
        try {
            console.log("📸 Running scheduled snapshot creation...");

            // This is a placeholder implementation
            // In a real application, you would:
            // 1. Query all users who have opted in for automatic snapshots
            // 2. For each user, fetch their current GitHub stats
            // 3. Create a snapshot using analyticsModel.createSnapshot()

            console.log(
                "ℹ️  Scheduled snapshots require user-specific GitHub data fetching"
            );
            console.log(
                "ℹ️  Implement this based on your GitHub API integration strategy"
            );
        } catch (error) {
            console.error("❌ Error in scheduled snapshot:", error);
        }
    }

    /**
     * Perform scheduled cleanup of old data
     */
    async performScheduledCleanup() {
        try {
            console.log("🧹 Running scheduled cleanup...");

            // Delete snapshots older than 365 days
            const deletedCount = await analyticsModel.deleteOldSnapshots(365);

            console.log(`✅ Cleanup complete: Deleted ${deletedCount} old snapshots`);
        } catch (error) {
            console.error("❌ Error in scheduled cleanup:", error);
        }
    }

    /**
     * Manually trigger a snapshot for a specific user
     * @param {number} userId - User ID
     * @param {string} githubUsername - GitHub username
     * @param {object} githubData - GitHub data object
     */
    async createManualSnapshot(userId, githubUsername, githubData) {
        try {
            const snapshotData = {
                stars: githubData.stars || 0,
                followers: githubData.followers || 0,
                following: githubData.following || 0,
                publicRepos: githubData.public_repos || 0,
                totalCommits: githubData.total_commits || 0,
                languageStats: githubData.language_stats || {},
                contributionCount: githubData.contribution_count || 0,
            };

            const snapshotId = await analyticsModel.createSnapshot(
                userId,
                githubUsername,
                snapshotData
            );

            console.log(
                `✅ Manual snapshot created for user ${userId}: ID ${snapshotId}`
            );
            return snapshotId;
        } catch (error) {
            console.error("❌ Error creating manual snapshot:", error);
            throw error;
        }
    }

    /**
     * FORENSIC TIME-TRAVEL: Record Health Snapshot
     * Captures current project health metrics for historical analysis
     * @param {string} repoPath - Repository path
     */
    async recordHealthSnapshot(repoPath = './') {
        try {
            const gitTimeMachine = require('./git-time-machine.service');
            const riskEngine = require('./risk-engine.service');

            // Get current health metrics
            const now = new Date();
            const healthData = await gitTimeMachine.calculateWeeklyHealth(repoPath, now, 0);

            // Get risk galaxy data for additional context
            const riskData = await riskEngine.calculateRiskGalaxy();
            const avgRisk = riskData.reduce((sum, file) => sum + file.score, 0) / riskData.length;

            // Enhance with real-time data
            const snapshot = {
                ...healthData,
                metrics: {
                    ...healthData.metrics,
                    riskScore: Math.round(avgRisk),
                    fileCount: riskData.length
                },
                timestamp: now.getTime(),
                recorded: true
            };

            console.log(`📸 Health snapshot recorded: Score ${snapshot.healthScore} (${snapshot.status})`);

            // In production, save to database
            // await db.saveHealthSnapshot(snapshot);

            return snapshot;
        } catch (error) {
            console.error('❌ Error recording health snapshot:', error);
            throw error;
        }
    }

    /**
     * Start periodic health snapshot recording
     * @param {number} intervalHours - Hours between snapshots (default: 168 = 1 week)
     */
    startHealthSnapshots(intervalHours = 168) {
        console.log(`🕐 Starting health snapshot recording every ${intervalHours}h`);

        const intervalMs = intervalHours * 60 * 60 * 1000;
        this.healthSnapshotInterval = setInterval(() => {
            this.recordHealthSnapshot();
        }, intervalMs);

        // Record initial snapshot
        this.recordHealthSnapshot();
    }
}

// Export singleton instance
module.exports = new AnalyticsScheduler();

