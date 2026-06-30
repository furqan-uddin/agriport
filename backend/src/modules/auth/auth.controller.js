import * as authService from './auth.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import { successResponse } from '../../utils/apiResponse.js';
import env from '../../config/env.js';
import { serializeUser } from '../users/user.controller.js';

/**
 * Utility to set JWT Refresh Token in an HTTP-only secure cookie
 */
const setRefreshTokenCookie = (res, token) => {
  const expiryDays = 7; // Matches JWT_REFRESH_EXPIRES_IN = 7d
  const cookieOptions = {
    expires: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };
  res.cookie('refreshToken', token, cookieOptions);
};

/**
 * Utility to extract cookie by name manually from request headers
 */
const getCookieFromHeader = (req, name) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(';').reduce((acc, c) => {
    const [key, val] = c.trim().split('=');
    if (key && val) {
      acc[key] = decodeURIComponent(val);
    }
    return acc;
  }, {});
  return cookies[name] || null;
};

// 1. Send OTP Controller
export const sendOtp = asyncWrapper(async (req, res) => {
  const { mobile, purpose } = req.body;
  const result = await authService.sendOtp(mobile, purpose);
  return successResponse(res, result, 200, result.message);
});

// 2. Verify OTP Controller
export const verifyOtp = asyncWrapper(async (req, res, next) => {
  const { mobile, otpCode, purpose } = req.body;
  const result = await authService.verifyOtp(mobile, otpCode, purpose);

  if (result.purpose === 'login') {
    const deviceInfo = {
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    };
    const loginResult = await authService.loginWithOtp(mobile, deviceInfo);
    setRefreshTokenCookie(res, loginResult.refreshToken);
    return successResponse(res, {
      user: serializeUser(loginResult.user),
      accessToken: loginResult.accessToken,
    }, 200, 'Logged in successfully via OTP.');
  }

  return successResponse(res, result, 200, result.message);
});

// 3. Customer Signup Controller
export const signupCustomer = asyncWrapper(async (req, res) => {
  const deviceInfo = {
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
  const result = await authService.signupCustomer(req.body, deviceInfo);
  
  if (result.refreshToken) {
    // Set refresh token cookie
    setRefreshTokenCookie(res, result.refreshToken);
  }

  // Return user details + access token (if active)
  const responseData = {
    user: serializeUser(result.user),
    accessToken: result.accessToken,
  };
  return successResponse(res, responseData, 201, result.message || 'Customer registered successfully.');
});

// 4. Executive Signup Controller (uses Multer files from handleUploads middleware)
export const signupExecutive = asyncWrapper(async (req, res) => {
  // Pass parsed files mapping from handleUploads middleware
  const result = await authService.signupExecutive(req.body, req.uploadedFiles);
  return successResponse(res, result, 201, result.message);
});

// 5. User Login Controller
export const login = asyncWrapper(async (req, res) => {
  const { loginId, password } = req.body;
  const deviceInfo = {
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
  const result = await authService.login(loginId, password, deviceInfo);

  // Set refresh token cookie
  setRefreshTokenCookie(res, result.refreshToken);

  // Return user details + access token
  const responseData = {
    user: serializeUser(result.user),
    accessToken: result.accessToken,
  };
  return successResponse(res, responseData, 200, 'Logged in successfully.');
});

// 6. Refresh Token Rotation Controller
export const refreshToken = asyncWrapper(async (req, res) => {
  // Attempt to read from HTTP-only cookie first, fallback to request body
  const cookieToken = getCookieFromHeader(req, 'refreshToken');
  const token = cookieToken || req.body.refreshToken;

  const deviceInfo = {
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
  const result = await authService.refreshToken(token, deviceInfo);

  // Rotate the refresh token cookie
  setRefreshTokenCookie(res, result.refreshToken);

  return successResponse(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }, 200, 'Access token refreshed successfully.');
});

// 7. User Logout Controller
export const logout = asyncWrapper(async (req, res) => {
  const cookieToken = getCookieFromHeader(req, 'refreshToken');
  const token = cookieToken || req.body.refreshToken;

  if (token) {
    await authService.logout(token);
  }

  // Clear the refresh token cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0), // Expire immediately
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  return successResponse(res, null, 200, 'Logged out successfully.');
});

// 8. Forgot Password Controller
export const forgotPassword = asyncWrapper(async (req, res) => {
  const { identifier } = req.body;
  const result = await authService.forgotPassword(identifier);
  return successResponse(res, null, 200, result.message);
});

// 9. Reset Password Controller
export const resetPassword = asyncWrapper(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password);
  return successResponse(res, null, 200, result.message);
});

