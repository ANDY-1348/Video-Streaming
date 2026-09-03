
const { Worker, QueueEvents } = require('bullmq');
const { VIDEO_QUEUE_EVENTS } = require('./constants');
const { QUEUE_EVENT_HANDLERS } = require('./handlers');
const logger = require('../../logger');

// Minimal Redis connection configuration used by BullMQ
const redisConnection = {
  host: process.env.REDIS_SERVER || 'localhost',
  port: 6379,
};

// Start listening and processing jobs for a specific queue
const listenQueueEvent = (queueName) => {
  const queueEvents = new QueueEvents(queueName, {
    connection: redisConnection,
  });

  // Listen for job failures reported by QueueEvents
  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.info(`Job ${jobId} failed: ${failedReason}`);
  });

  // Create a worker to process incoming jobs for this queue
  const worker = new Worker(
    queueName,
    async (job) => {
      const handler = QUEUE_EVENT_HANDLERS[queueName];
      if (handler) {
        return await handler(job);
      }
      throw new Error('No handler found for queue: ' + queueName);
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.info(`Job ${job.id} processing failed: ${err.message}`);
  });

  logger.info(`${queueName} worker initialized at ${new Date().toTimeString()}`);
};

// Helper to setup all configured video-related queue listeners
const setupAllQueueEvents = () => {
  Object.values(VIDEO_QUEUE_EVENTS).forEach((queueName) =>
    listenQueueEvent(queueName)
  );

  // Ensure video handler setup runs as well
  const { setup: setupVideoHandler } = require('../models/video/handler');
  setupVideoHandler();
  return true;
};

module.exports = { setupAllQueueEvents, listenQueueEvent };

