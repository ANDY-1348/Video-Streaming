
const EventEmitter = require('events');

class EventManager {
  constructor() {
    // Lazily initialize the shared EventEmitter instance
    if (!EventManager.instance) {
      EventManager.instance = new EventEmitter();
    }
  }

  // Return the shared emitter instance
  // eslint-disable-next-line class-methods-use-this
  getInstance() {
    return EventManager.instance;
  }
}

module.exports = new EventManager();

