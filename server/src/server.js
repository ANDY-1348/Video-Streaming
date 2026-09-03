// Import the Express app and a simple logger utility
const app = require('./app');
const logger = require('./logger');

// MongoDB connection manager abstraction
const { MongoManager } = require('./modules/db/mongo');

// Queue/event constants used across the app
const { NOTIFY_EVENTS } = require('./modules/queues/constants');

// Application-wide event emitter (singleton) used for internal notifications
const eventEmitter = require('./event-manager').getInstance();

// Default port for this server (can be overridden with process.env.PORT)
const PORT = 4000;

/**
 * setup()
 * - Loads and initializes domain modules (controllers, queue listeners, etc.)
 * - Keeps startup wiring in one place so server.listen can simply call setup()
 */
const setup = async () => {
  // Dynamically require module controllers and call their setup functions to
  // attach routes, middleware, or other initialization logic to the Express app.

  // Video module: attaches video-related routes/controllers to `app`
  const { setup: setupVideoModule } =
    await require('./modules/models/video/controller');
  setupVideoModule(app);

  // Role module: attaches role-related routes/controllers to `app`
  const { setup: setupRoleModule } =
    await require('./modules/models/role/controller');
  setupRoleModule(app);

  // Queue worker: start listening to background queue events we care about
  const { listenQueueEvent } = await require('./modules/queues/worker');
  listenQueueEvent(NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED);

  // Listen for internal notify events and broadcast to connected socket clients.
  // The eventEmitter decouples internal queue handling from socket broadcasting.
  eventEmitter.on(NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED, (data) => {
    logger.info('NOTIFY_EVENTS.NOTIFY_VIDEO_HLS_CONVERTED Event handler', data);
    io.emit('hello', data); // emit to all connected socket.io clients
  });
};

// HTTP + Socket.IO setup
const http = require('http');
const server = http.createServer(app);

// Create a socket.io server, allowing all origins for now (CORS: '*').
// In production, restrict origin to your front-end domain.
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// Socket connection lifecycle handling
io.on('connection', (socket) => {
  logger.info('a user connected');
  logger.info(socket.id);

  // Example: you can send periodic messages or handle custom events here.
  // The commented block below shows an example heartbeat emitter:
  // setInterval(() => {
  //   logger.info("sending heartbeat", new Date().toTimeString());
  //   io.emit("hello", "world", new Date().toTimeString());
  // }, 15000);

  // Clean up when a client disconnects (optional)
  socket.on('disconnect', () => {
    logger.info(`socket ${socket.id} disconnected`);
  });
});

// Start the HTTP server. The listen callback performs asynchronous startup
// tasks (e.g., DB connection and module setup) so that the app is fully ready.
server.listen(PORT, async () => {
  logger.info(`listening on port ${PORT}`);

  // Connect to MongoDB (abstraction handles connection details)
  await MongoManager.connect();

  // Initialize application modules and queue listeners
  await setup();

  // Signal that setup is complete
  logger.info('application setup completed');

  // A simple catch-all route useful for quick checks. In real apps, this should
  // be removed or restricted (and not log request bodies in production).
  app.use('/', (req, res) => {
    logger.info(`request received at ${new Date().toISOString()}`);
    logger.info('req.body', req.body);
    res.send(`request received at ${new Date().toISOString()}`);
  });

  // Final start message with human-friendly time
  logger.info('application started', new Date().toTimeString());
});
