
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Port dedicated to serving HLS video fragments and playlists
const port = 4001;
const publicDirectory = './uploads/hls';

// Lightweight request handler that streams files from the publicDirectory
const requestHandler = (req, res) => {
  const filePath = path.join(publicDirectory, req.url);
  logger.info('resolved filePath for request', filePath);

  // Check file existence before attempting to read it
  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.statusCode = 404;
      res.end(`Not found: ${filePath}`);
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end(`Failed reading file: ${err}`);
        return;
      }

      // Allow any origin (CORS). Restrict this in production if needed.
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
      res.setHeader('Access-Control-Max-Age', 2592000); // 30 days
      res.end(data);
    });
  });
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    logger.error(`Unable to start video server: ${err}`);
    return;
  }

  logger.info(`Video asset server is listening on port ${port}`);
});

