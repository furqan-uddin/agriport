import { EventEmitter } from 'events';
import logger from '../config/logger.js';

class EventBus extends EventEmitter {
  emit(event, ...args) {
    logger.info(`[EventBus] Emitting event: "${event}"`);
    return super.emit(event, ...args);
  }
}

const eventBus = new EventBus();

export default eventBus;
