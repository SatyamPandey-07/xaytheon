const IORedis = require('ioredis');

// Default Redis configuration
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null, // Required for BullMQ
});

module.exports = connection;
