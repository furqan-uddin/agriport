import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';
import { stopBackgroundJobs } from '../jobs/jobQueue.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    
    logger.info(`💾 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Monitor connection events
mongoose.connection.on('error', (err) => {
  logger.error(`❌ Mongoose Connection Event Error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ Mongoose connection disconnected');
});

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Closing scheduler and database connections gracefully...`);
  try {
    await stopBackgroundJobs();
    await mongoose.connection.close();
    logger.info('Scheduler and database connections closed successfully.');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during graceful shutdown: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
