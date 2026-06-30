import logger from '../config/logger.js';
import { errorResponse } from '../utils/apiResponse.js';

// Development Error formatting
const sendErrorDev = (err, res) => {
  logger.error(`Error in DEV: ${err.message}`, { stack: err.stack });
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

// Production Error formatting
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return errorResponse(res, err.message, err.statusCode, err.status);
  }

  // Programming or other unknown error: don't leak details to user
  logger.error('❌ PROGRAMMING/UNKNOWN ERROR:', err);
  
  return errorResponse(res, 'Something went very wrong. Please try again later.', 500, 'error');
};

// Handle specific database/library errors
const handleCastErrorDB = (err) => {
  const message = `Invalid value for path ${err.path}: ${err.value}`;
  return { message, statusCode: 400, isOperational: true };
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return { message, statusCode: 409, isOperational: true };
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return { message, statusCode: 400, isOperational: true };
};

const handleJWTError = () => {
  return { message: 'Invalid token. Please log in again!', statusCode: 401, isOperational: true };
};

const handleJWTExpiredError = () => {
  return { message: 'Your session has expired. Please log in again!', statusCode: 401, isOperational: true };
};

export default (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Map DB & Auth errors to standard operational format
    if (err.name === 'CastError') {
      const details = handleCastErrorDB(err);
      error = Object.assign(error, details);
    }
    if (err.code === 11000) {
      const details = handleDuplicateFieldsDB(err);
      error = Object.assign(error, details);
    }
    if (err.name === 'ValidationError') {
      const details = handleValidationErrorDB(err);
      error = Object.assign(error, details);
    }
    if (err.name === 'JsonWebTokenError') {
      const details = handleJWTError();
      error = Object.assign(error, details);
    }
    if (err.name === 'TokenExpiredError') {
      const details = handleJWTExpiredError();
      error = Object.assign(error, details);
    }

    sendErrorProd(error, res);
  }
};
