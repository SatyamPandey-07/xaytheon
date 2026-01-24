const { Queue } = require('bullmq');
const connection = require('./connection');
const { processAnalyticsJob } = require('../services/analytics.processor');

let analyticsQueue;

try {
    analyticsQueue = new Queue('analytics-processing', { connection });

    analyticsQueue.on('error', (err) => {
        // Suppress unhandled redis errors in queue
        console.warn('Queue Redis Error:', err.message);
    });
} catch (err) {
    console.warn("⚠️ Failed to initialize BullMQ Queue (Redis missing?):", err.message);
}

/**
 * Add a job to the analytics queue
 * @param {string} userId - The ID of the user request
 * @param {string} githubUsername - The GitHub username to analyze
 */
const addAnalyticsJob = async (userId, githubUsername) => {
    try {
        // Check IORedis status
        if (analyticsQueue && connection.status === 'ready') {
            return await analyticsQueue.add('process-analytics', {
                userId,
                githubUsername
            }, {
                removeOnComplete: true,
                removeOnFail: 5000
            });
        } else {
            throw new Error(`Redis status: ${connection.status || 'unknown'}`);
        }
    } catch (err) {
        console.warn(`⚠️ Queue unavailable (${err.message}). Running job IN-MEMORY (Fallback).`);

        // Execute logic directly (async, mimic background job)
        processAnalyticsJob({ userId, githubUsername })
            .catch(e => console.error("Inline Fallback Failed:", e.message));

        return null;
    }
};

module.exports = {
    analyticsQueue,
    addAnalyticsJob
};
