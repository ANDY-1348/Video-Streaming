
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const {
  insert,
  search,
  update,
  updateViewCount,
  deleteById,
  count,
} = require('./service');
const { validate } = require('./request');
const { VIDEO_QUEUE_EVENTS: QUEUE_EVENTS } = require('../../queues/constants');
const { VIDEO_STATUS } = require('../../db/constant');
const { addQueueItem } = require('../../queues/queue');
const { getVideoDurationAndResolution } = require('../../queues/video-processor');
const logger = require('../../../logger');

const BASE_URL = `/api/videos`;

const setupRoutes = (app) => {
  logger.info(`registering routes under ${BASE_URL}`);

  // List published videos
  app.get(`${BASE_URL}/`, async (req, res) => {
    logger.info('GET list videos', req.params);
    const data = await search({});
    res.send({ status: 'success', message: 'OK', timestamp: new Date(), data });
  });

  // Get detail and increment view count
  app.get(`${BASE_URL}/detail/:id`, async (req, res) => {
    logger.info('GET detail', req.params);
    const video = await updateViewCount(req.params.id);
    if (video instanceof Error) {
      return res.status(400).json(JSON.parse(video.message));
    }
    res.send(video);
  });

  // Search endpoint (supports paging via request body)
  app.post(`${BASE_URL}/search`, async (req, res) => {
    logger.info('POST search', req.body);
    const result = await search(req.body);
    res.send(result);
  });

  app.post(`${BASE_URL}/count`, async (req, res) => {
    logger.info('POST count', req.body);
    const result = await count(req.body);
    res.send({ count: result });
  });

  app.put(`${BASE_URL}/update/:id`, async (req, res) => {
    const validationResult = validate(req.body);
    if (req.params.id && !validationResult.error) {
      const result = await update({ _id: req.params.id, ...validationResult.value });
      if (result instanceof Error) {
        return res.status(400).json(JSON.parse(result.message));
      }
      return res.json(result);
    }
    return res.status(400).json({ status: 'error', message: validationResult.error });
  });

  app.delete(`${BASE_URL}/delete/:id`, async (req, res) => {
    logger.info('DELETE video', req.params.id);
    if (req.params.id) {
      const result = await deleteById(req.params.id);
      if (result instanceof Error) {
        res.status(400).json(JSON.parse(result.message));
        return;
      }
      return res.json(result);
    }
    return res.status(400).json({ status: 'error', message: 'Id required' });
  });

  // Upload handling using multer + S3 (or S3-compatible storage)
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/videos');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
      logger.info('file type supported', file.originalname);
      cb(null, true);
    } else {
      logger.info('file type not supported', file.originalname);
      cb(new multer.MulterError('File type not supported'), false);
    }
  };

  const s3Client = new S3Client({
    endpoint: process.env.ENDPOINT,
    forcePathStyle: false,
    region: process.env.REGION,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY,
      secretAccessKey: process.env.ACCESS_TOKEN,
    },
  });

  const s3Storage = multerS3({
    s3: s3Client,
    bucket: process.env.BUCKET_NAME,
    acl: 'private',
  });

  const upload = multer({ fileFilter: fileFilter, limits: { fileSize: 50000000 }, storage: s3Storage }).single('video');

  const uploadProcessor = (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        res.status(400).json({ status: 'error', error: err });
        return;
      } else {
        logger.info('upload success', req.file);
        next();
      }
    });
  };

  app.post(`${BASE_URL}/upload`, uploadProcessor, async (req, res) => {
    try {
      const dbPayload = {
        ...req.body,
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        recordingDate: new Date(),
        videoLink: req.file.location,
        viewCount: 0,
        duration: 0,
        status: VIDEO_STATUS.PUBLISHED,
      };
      logger.info('dbPayload', { dbPayload });
      const result = await insert(dbPayload);
      logger.info('insert result', result);

      res.status(200).json({ status: 'success', message: 'Upload success', ...req.file, ...result });
      return;
    } catch (error) {
      logger.error(error);
      res.send(error);
    }
  });
};

const setup = (app) => {
  setupRoutes(app);
};

module.exports = { setup };
