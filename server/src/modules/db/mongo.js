
const fs = require('fs');
const path = require('path');

const winston = require('winston');
const winstonMongo = require('winston-mongodb');

const { MongoClient } = require('mongodb');

const logger = require('../../logger');

class MongoManager {
  // Store the singleton DB instance
  static async setInstance(instance) {
    if (!MongoManager.instance) {
      logger.info('MongoManager: setting DB instance');
      MongoManager.instance = instance;
    }
  }

  static get Instance() {
    return MongoManager.instance;
  }

  // Load and apply all schema update scripts from ./schemas
  static updateSchemas = async () => {
    const directoryPath = path.join(__dirname, 'schemas');
    const files = fs.readdirSync(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const { updateSchema } = require(filePath);
      if (updateSchema) await updateSchema(MongoManager.instance);
    }
  };

  // Connect to MongoDB and initialize the DB instance
  static connect = async () => {
    if (MongoManager.instance) return MongoManager.instance;

    const mongoUrl = process.env.MONGODB_URL ?? 'mongodb://localhost:27017';
    const client = new MongoClient(mongoUrl, { useNewUrlParser: true });
    logger.info('connecting to MongoDB at ' + mongoUrl);
    await client.connect();
    const db = client.db('videodb');

    // Optionally pipe Winston logs into MongoDB
    if (process.env.ENABLE_WINSTON_MONGODB === 'true') {
      try {
        logger.add(
          new winston.transports.MongoDB({ db, collection: 'logs', storeHost: true, level: 'info' })
        );
      } catch (error) {
        logger.error(error);
      }
    }

    logger.info('connected to MongoDB');
    await MongoManager.setInstance(db);
    await MongoManager.updateSchemas();

    return db;
  };
}

module.exports = { MongoManager };

