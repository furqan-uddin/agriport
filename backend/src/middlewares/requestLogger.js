import morgan from 'morgan';
import logger from '../config/logger.js';

// Setup Morgan request logging stream into Winston logger
const requestLogger = () => {
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  return morgan(format, {
    stream: logger.stream,
    // Do not log health check checks in production to keep logs clean
    skip: (req) => process.env.NODE_ENV === 'production' && req.originalUrl === '/api/v1/health',
  });
};

export default requestLogger;
