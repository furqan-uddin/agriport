import express from 'express';
import * as authController from './auth.controller.js';
import validate from '../../middlewares/validate.js';
import handleUploads from '../../middlewares/upload.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  customerSignupSchema,
  executiveSignupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validator.js';

const router = express.Router();

// Apply stricter rate limiting to authentication routes
router.use(authLimiter);

// 1. Send OTP route
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);

// 2. Verify OTP route
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// 3. Customer Signup route (requires OTP verification first)
router.post('/signup/customer', validate(customerSignupSchema), authController.signupCustomer);

// 4. Executive Signup route (requires Aadhaar + PAN file uploads)
router.post(
  '/signup/executive',
  handleUploads([
    { name: 'aadhaarCard', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
  ]),
  validate(executiveSignupSchema),
  authController.signupExecutive
);

// 5. User Login route (Email/Mobile + Password)
router.post('/login', validate(loginSchema), authController.login);

// 6. Refresh Token rotation route
router.post('/refresh', authController.refreshToken);

// 7. Logout route
router.post('/logout', authController.logout);

// 8. Forgot Password route
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

// 9. Reset Password route
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;

