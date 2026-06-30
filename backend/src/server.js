import app from './app.js';
import { connectDB } from './config/db.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { startBackgroundJobs } from './jobs/jobQueue.js';

// 1. Handle Synchronous Uncaught Exceptions (e.g. console.log(nonExistentVar))
process.on('uncaughtException', (err) => {
  logger.error('❌ UNCAUGHT EXCEPTION! Shutting down server gracefully...', err);
  process.exit(1);
});

// 2. Connect Database
connectDB();
startBackgroundJobs().catch((err) => {
  logger.error('❌ Failed to start background jobs scheduler:', err);
});

// 3. Start Server Listen
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// 4. Handle Asynchronous Unhandled Rejections (e.g. unhandled database connection failures)
process.on('unhandledRejection', (err) => {
  logger.error('❌ UNHANDLED REJECTION! Shutting down server gracefully...', err);
  server.close(() => {
    process.exit(1);
  });
});
