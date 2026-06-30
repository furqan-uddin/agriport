import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Limit each IP to 300 requests per window
  standardHeaders: 'draft-7', // combined RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    return errorResponse(res, 'Too many requests from this IP, please try again after 15 minutes.', 429, 'fail');
  },
});

// Stricter rate limiter for authentication routes (login, verify OTP, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // Limit each IP to 20 auth requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 'Too many authentication attempts. Please try again after 15 minutes.', 429, 'fail');
  },
});

export default globalLimiter;
