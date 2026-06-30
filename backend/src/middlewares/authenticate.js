import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import User from '../modules/users/user.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';

export const authenticate = asyncWrapper(async (req, res, next) => {
  // 1. Get token from Authorization header or Query parameter
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2. Verify JWT token
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again!', 401));
    }
    return next(new AppError('Invalid token. Please log in again!', 401));
  }

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  // 4. Check if user account is active, pending or blocked
  if (currentUser.status === 'pending') {
    // List of whitelisted routes for pending users (onboarding)
    const whitelist = [
      '/api/v1/users/me',
      '/api/v1/users/me/documents',
      '/api/v1/auth/logout'
    ];
    const isWhitelisted = whitelist.some(route => req.originalUrl.startsWith(route));
    if (!isWhitelisted) {
      return next(new AppError('Your account is pending verification. Please complete KYC and wait for admin approval.', 403));
    }
  } else if (currentUser.status !== 'active') {
    return next(new AppError(`Your account is currently ${currentUser.status}. Please contact support.`, 403));
  }

  // 5. Grant access: attach user object to request
  req.user = currentUser;
  next();
});

export const optionalAuthenticate = asyncWrapper(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.status === 'active') {
      req.user = currentUser;
    }
  } catch (err) {
    // Ignore invalid/expired tokens for optional authentication
  }

  next();
});

export default authenticate;
