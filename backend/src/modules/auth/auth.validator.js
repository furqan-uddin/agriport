import { z } from 'zod';

// Helper to validate standard 10-digit Indian phone numbers
const mobileRegex = /^[6-9]\d{9}$/;

export const sendOtpSchema = z.object({
  mobile: z.string().regex(mobileRegex, 'Please provide a valid 10-digit mobile number'),
  purpose: z.enum(['signup', 'login'], {
    errorMap: () => ({ message: 'Purpose must be either "signup" or "login"' }),
  }),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().regex(mobileRegex, 'Please provide a valid 10-digit mobile number'),
  otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
  purpose: z.enum(['signup', 'login']).optional(),
});

export const customerSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  email: z.string().email('Please provide a valid email address').trim(),
  mobile: z.string().regex(mobileRegex, 'Please provide a valid 10-digit mobile number'),
  companyName: z.string().min(2, 'Company name is required').trim(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST Number format').optional().or(z.literal('')),
  city: z.string().min(2, 'City is required').trim(),
  businessType: z.string().min(2, 'Business type is required').trim(),
});

export const executiveSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  email: z.string().email('Please provide a valid email address').trim(),
  mobile: z.string().regex(mobileRegex, 'Please provide a valid 10-digit mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  region: z.string().min(2, 'Region is required').trim(),
  target: z.preprocess((val) => Number(val), z.number().default(0)),
});

export const loginSchema = z.object({
  loginId: z.string().min(1, 'Email or Mobile number is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or Mobile number is required').trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(6, 'Reset code must be at least 6 digits').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

