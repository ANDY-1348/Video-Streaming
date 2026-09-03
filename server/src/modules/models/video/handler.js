
const eventEmitter = require('../../../event-manager').getInstance();
const { VIDEO_QUEUE_EVENTS } = require('../../queues/constants');
const { updateHistory, update } = require('./service');
const { VIDEO_STATUS } = require('../../db/constant');

const setup = () => {
  const SERVER_URL = process.env.SERVER_URL;

  // Subscribe to all video-related queue events and handle them
  Object.values(VIDEO_QUEUE_EVENTS).forEach((eventName) => {
    eventEmitter.on(eventName, async (data) => {
      // Persist a history entry for every observed event
      if (eventName === VIDEO_QUEUE_EVENTS.VIDEO_PROCESSED) {
        await updateHistory(data.id, {
          history: { status: eventName, createdAt: new Date() },
          processedPath: data.path,
        });
        return;
      }

      if (eventName === VIDEO_QUEUE_EVENTS.VIDEO_HLS_CONVERTED) {
        await updateHistory(data.id, {
          history: { status: eventName, createdAt: new Date() },
          hlsPath: data.path,
        });

        // Mark video as published once HLS is available
        await update({ _id: data.id, status: VIDEO_STATUS.PUBLISHED });
        return;
      }

      if (eventName === VIDEO_QUEUE_EVENTS.VIDEO_THUMBNAIL_GENERATED) {
        await updateHistory(data.id, {
          history: { status: eventName, createdAt: new Date() },
          thumbnailPath: data.path,
          thumbnailUrl: `${SERVER_URL}/thumbnails/${data.filename}.png`,
        });
        return;
      }

      // Default: just push a history entry
      await updateHistory(data.id, {
        history: { status: eventName, createdAt: new Date() },
      });
    });
  });
};

module.exports = { setup };
