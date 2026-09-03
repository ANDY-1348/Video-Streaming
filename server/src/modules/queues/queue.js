
const { Queue } = require('bullmq');
const { ALL_EVENTS: QUEUE_EVENTS } = require('./constants');
const logger = require('../../logger');
const eventEmitter = require('../../event-manager').getInstance();

const redisConnection = {
  host: process.env.REDIS_SERVER || 'localhost',
  port: 6379,
};

// Build Queue instances for all known events
const queues = Object.values(QUEUE_EVENTS).map((queueName) => ({
  name: queueName,
  queueObj: new Queue(queueName, { connection: redisConnection }),
}));

// Push an item into the named queue and also broadcast a local event
const addQueueItem = async (queueName, item) => {
  logger.info('enqueue item', queueName, item);
  const queue = queues.find((q) => q.name === queueName);
  if (!queue) {
    throw new Error(`queue ${queueName} not found`);
  }

  // Emit a local event (useful for in-process listeners) then enqueue for workers
  eventEmitter.emit(`${queueName}`, item);
  await queue.queueObj.add(queueName, item, {
    removeOnComplete: true,
    removeOnFail: false,
  });
};

module.exports = { addQueueItem };



