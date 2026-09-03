
const ffmpeg = require('fluent-ffmpeg');

const configureFFMPEG = async () => {
  // Paths are system-specific; change if ffmpeg is installed elsewhere
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  ffmpeg.setFfprobePath('/usr/bin/ffprobe');
};

configureFFMPEG();

const path = require('path');
const { VIDEO_QUEUE_EVENTS: QUEUE_EVENTS } = require('./constants');
const { addQueueItem } = require('./queue');
const logger = require('../../logger');

// Convert an uploaded/raw file into MP4 and enqueue the next processing step
const processRawFileToMp4 = async (filePath, outputFolder, jobData) => {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);
  const outputFileName = `${outputFolder}/${fileNameWithoutExt}.mp4`;

  ffmpeg(filePath)
    .output(outputFileName)
    .on('start', function (commandLine) {
      logger.info('FFmpeg started with: ' + commandLine);
    })
    .on('progress', function (progress) {
      if (parseInt(progress.percent) % 20 === 0) {
        logger.info(`Conversion progress: ${progress.percent}%`);
      }
    })
    .on('end', async function () {
      logger.info('MP4 conversion complete: ' + outputFileName);
      await addQueueItem(QUEUE_EVENTS.VIDEO_PROCESSED, {
        ...jobData,
        completed: true,
        path: outputFileName,
      });
    })
    .on('error', function (err) {
      logger.info('FFmpeg error: ' + err.message);
    })
    .run();

  // Fire-and-forget thumbnail generation
  generateThumbnail(filePath, './uploads/thumbnails', {
    ...jobData,
    completed: true,
  });
  return;
};

// Create a thumbnail from the video at 00:01 and enqueue a thumbnail event
const generateThumbnail = async (filePath, outputFolder, jobData) => {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);
  const outputFileName = `${outputFolder}/${fileNameWithoutExt}.png`;

  ffmpeg(filePath)
    .screenshots({
      timestamps: ['00:01'],
      filename: `${fileNameWithoutExt}.png`,
      folder: `${outputFolder}`,
      // size: '320x240',
    })
    .on('end', async function () {
      await addQueueItem(QUEUE_EVENTS.VIDEO_THUMBNAIL_GENERATED, {
        ...jobData,
        completed: true,
        path: outputFileName,
      });
    });
  return;
};

// Convert MP4 into HLS format and enqueue HLS-converted event
const processMp4ToHls = async (filePath, outputFolder, jobData) => {
  const fileExt = path.extname(filePath);
  const fileNameWithoutExt = path.basename(filePath, fileExt);
  const outputFileName = `${outputFolder}/${fileNameWithoutExt}.m3u8`;

  // Probe for metadata (non-blocking callback)
  ffmpeg.ffprobe(filePath, function (err, metadata) {
    logger.info('FFprobe metadata result', err, metadata);
  });

  ffmpeg(filePath)
    .output(outputFileName)
    .outputOptions([
      '-hls_time 10',
      '-hls_list_size 0',
      '-hls_flags delete_segments',
      '-hls_segment_filename',
      `${outputFolder}/${fileNameWithoutExt}_%03d.ts`,
    ])
    .on('start', function (commandLine) {
      logger.info('FFmpeg HLS command: ' + commandLine);
    })
    .on('progress', function (progress) {
      if (parseInt(progress.percent) % 20 === 0) {
        logger.info(`HLS progress: ${progress.percent}%`);
      }
    })
    .on('end', function (x) {
      logger.info('HLS conversion finished: ' + outputFileName, x);
      addQueueItem(QUEUE_EVENTS.VIDEO_HLS_CONVERTED, {
        ...jobData,
        path: outputFileName,
      });
    })
    .on('error', function (err) {
      logger.info('FFmpeg HLS error: ' + err.message);
    })
    .run();

  return;
};

// Return basic duration and resolution information for a video file
const getVideoDurationAndResolution = async (filePath) => {
  return new Promise((resolve, reject) => {
    let videoDuration = 0;
    let videoResolution = { height: 0, width: 0 };
    ffmpeg.ffprobe(filePath, function (err, metadata) {
      if (!err) {
        videoDuration = parseInt(metadata.format.duration);
        videoResolution = {
          height: metadata.streams[0].coded_height,
          width: metadata.streams[0].coded_width,
        };
        resolve({ videoDuration, videoResolution });
        return;
      }
      logger.error(err);
      reject(err);
    });
  });
};

module.exports = {
  processRawFileToMp4,
  processMp4ToHls,
  generateThumbnail,
  getVideoDurationAndResolution,
};

