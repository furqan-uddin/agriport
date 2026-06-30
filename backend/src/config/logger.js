import winston from 'winston';
import env from './env.js';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Format for console logs in development
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // capture stack traces
    env.NODE_ENV === 'development' ? combine(colorize(), consoleFormat) : json()
  ),
  transports: [
    // Output logs to the console
    new winston.transports.Console(),
  ],
});

// In production, add file logging
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create a stream object for Morgan middleware integration
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export default logger;
