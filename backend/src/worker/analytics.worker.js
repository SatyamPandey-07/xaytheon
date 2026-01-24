const { Worker } = require('bullmq');
const connection = require('../queue/connection');
const { processAnalyticsJob } = require('../services/analytics.processor');

try {
    const worker = new Worker('analytics-processing', async job => {
        return await processAnalyticsJob({
            ...job.data,
            jobId: job.id
        });
    }, { connection });

    worker.on('completed', job => {
        console.log(`[Worker] Job ${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
        console.log(`[Worker] Job ${job.id} has failed with ${err.message}`);
    });

    worker.on('error', err => {
        console.warn(`[Worker] Redis Connection Error: ${err.message}`);
    });

    module.exports = worker;
} catch (err) {
    console.warn("⚠️ Failed to initialize BullMQ Worker (Redis missing?):", err.message);
    module.exports = {};
}
