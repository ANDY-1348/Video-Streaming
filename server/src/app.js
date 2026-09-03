
require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

// Parse incoming JSON payloads
app.use(express.json());
// Enable gzip compression for responses
app.use(compression());
// Enable CORS for frontend clients (tweak origin in production)
app.use(cors());

const logger = require('./logger');

// Morgan middleware: route HTTP access logs into Winston's http level
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      // Use a concise write handler that forwards to the logger
      write: (message) => logger.http(message.trim()),
    },
  }
);
app.use(morganMiddleware);

// Serve generated thumbnails from the uploads folder
app.use('/thumbnails', express.static('./uploads/thumbnails'));

module.exports = app;

