
require('dotenv').config();
const logger = require('./logger');
const { MongoManager } = require('./modules/db/mongo');

const { setupAllQueueEvents } = require('./modules/queues/worker');

const setup = async () => {
  // Ensure DB is available before initializing workers
  await MongoManager.connect();
  const status = setupAllQueueEvents();
  logger.info('queue initialization status:', status);
};

setup();

