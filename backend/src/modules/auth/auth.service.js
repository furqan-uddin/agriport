import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../users/user.model.js';
import OTP from './otp.model.js';
import RefreshToken from './refreshToken.model.js';
import CRMCustomer from '../crm/crmCustomer.model.js';
import logger from '../../config/logger.js';
import notificationService from '../notifications/notification.service.js';
import AppError from '../../utils/AppError.js';
import env from '../../config/env.js';
import eventBus from '../../events/index.js';

/**
 * Helper to generate JWT access and refresh tokens and persist hashed refresh token in the database
 * @param {string} userId - Mongo user ID
 * @param {Object} deviceInfo - Device details (ip, userAgent)
 * @returns {Object} { accessToken, refreshToken }
 */
const generateAndPersistTokens = async (userId, deviceInfo = {}) => {
  const accessToken = jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  // Hashing the refresh token before saving in MongoDB for stolen token/leak protection
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Token expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    token: hashedToken,
    userId,
    expiresAt,
    device: {
      ip: deviceInfo.ip || '',
      userAgent: deviceInfo.userAgent || '',
    },
  });

  return { accessToken, refreshToken };
};

/**
 * Service to generate and send OTP
 */
export const sendOtp = async (mobile, purpose) => {
  // 1. Validation checks based on purpose
  const existingUser = await User.findOne({ mobile });

  if (purpose === 'signup') {
    if (existingUser) {
      throw new AppError('An account is already registered with this mobile number.', 409);
    }
  } else if (purpose === 'login') {
    if (!existingUser) {
      throw new AppError('No account found with this mobile number. Please register first.', 404);
    }
    if (existingUser.status !== 'active') {
      throw new AppError(`Your account is currently ${existingUser.status}. Please contact support.`, 403);
    }
  }

  // 2. Generate 6-digit OTP code
  // Generate random 6-digit code or use mock OTP 123456
  const otpCode = env.USE_MOCK_OTP
    ? '123456'
    : Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Save OTP to database (overwrite any previous non-expired OTPs for this number/purpose)
  await OTP.deleteMany({ mobile, purpose });
  await OTP.create({
    mobile,
    otpCode,
    purpose,
  });

  // 4. Send the OTP (async background dispatch)
  await notificationService.sendOTP({
    mobile,
    email: existingUser?.email || null,
    otpCode,
    purpose,
  });

  return { mobile, message: 'OTP sent successfully.' };
};

/**
 * Service to verify OTP
 */
export const verifyOtp = async (mobile, otpCode, purpose) => {
  // Find the latest active OTP for the mobile number and purpose
  const query = { mobile, verified: false };
  if (purpose) {
    query.purpose = purpose;
  }
  const otpRecord = await OTP.findOne(query).sort({ createdAt: -1 });

  if (!otpRecord) {
    throw new AppError('OTP has expired or does not exist. Please request a new one.', 400);
  }

  // Check code match
  if (otpRecord.otpCode !== otpCode) {
    throw new AppError('Invalid OTP code. Please check and try again.', 400);
  }

  // Mark as verified
  otpRecord.verified = true;
  await otpRecord.save();

  return { mobile, verified: true, message: 'OTP verified successfully.', purpose: otpRecord.purpose };
};

/**
 * Service to login using mobile OTP (customer login bypass)
 */
export const loginWithOtp = async (mobile, deviceInfo = {}) => {
  const user = await User.findOne({ mobile });
  if (!user) {
    throw new AppError('No account found with this mobile number.', 404);
  }
  if (user.status !== 'active') {
    throw new AppError(`Your account is currently ${user.status}. Please contact support.`, 403);
  }
  const { accessToken, refreshToken } = await generateAndPersistTokens(user._id, deviceInfo);
  user.password = undefined;
  return { user, accessToken, refreshToken };
};

/**
 * Service to register customer (requires OTP verification)
 */
export const signupCustomer = async (signupData, deviceInfo = {}) => {
  const { name, email, mobile, password, companyName, gstNumber, city, businessType } = signupData;

  // 1. Ensure mobile was verified via OTP
  const otpRecord = await OTP.findOne({ mobile, purpose: 'signup', verified: true });
  if (!otpRecord) {
    throw new AppError('Mobile number is not verified. Please verify mobile via OTP first.', 400);
  }

  // 2. Double-check email uniqueness
  const emailExists = await User.findOne({ email });
  if (emailExists) {
    throw new AppError('An account is already registered with this email address.', 409);
  }

  // 3. Create customer record
  const user = await User.create({
    name,
    email,
    mobile,
    password,
    role: 'customer',
    companyName,
    gstNumber,
    city,
    businessType,
  });

  // Link platformUserId to any existing CRM Customer documents with the same mobile phone number
  await CRMCustomer.updateMany({ phone: mobile, platformUserId: null }, { platformUserId: user._id });

  // 4. Clean up: Delete the used OTP record
  await OTP.deleteOne({ _id: otpRecord._id });

  // Exclude password from return payload
  user.password = undefined;

  // Emit customer.registered event
  eventBus.emit('customer.registered', user);

  // If customer status is pending by default, do not return access tokens
  if (user.status !== 'active') {
    return {
      user,
      message: 'Customer registration submitted successfully. Your account is pending KYC verification and Admin approval.',
    };
  }

  // 5. Generate auth tokens if active (fallback)
  const { accessToken, refreshToken } = await generateAndPersistTokens(user._id, deviceInfo);
  return { user, accessToken, refreshToken };
};

/**
 * Service to register executive (KYC documents upload, starts in pending)
 */
export const signupExecutive = async (signupData, uploadedFiles) => {
  const { name, email, mobile, password, region, target } = signupData;

  // 1. Verify KYC files were provided
  if (!uploadedFiles || !uploadedFiles.aadhaarCard || !uploadedFiles.panCard) {
    throw new AppError('Both Aadhaar Card and PAN Card KYC document uploads are required for Executive signup.', 400);
  }

  // 2. Check duplicate email or mobile
  const duplicateUser = await User.findOne({ $or: [{ email }, { mobile }] });
  if (duplicateUser) {
    throw new AppError('An account is already registered with this email or mobile number.', 409);
  }

  // 3. Create pending executive user
  const user = await User.create({
    name,
    email,
    mobile,
    password,
    role: 'executive',
    status: 'pending', // Pending Admin approval
    region,
    target: target || 0,
    aadhaarUrl: uploadedFiles.aadhaarCard[0],
    panUrl: uploadedFiles.panCard[0],
    kycVerified: false,
  });

  user.password = undefined;

  // Emit executive.registered event
  eventBus.emit('executive.registered', user);

  return {
    user,
    message: 'Executive registration submitted successfully. Your account is pending KYC verification and Admin approval.',
  };
};

/**
 * Service to authenticate users (email/mobile + password)
 */
export const login = async (loginId, password, deviceInfo = {}) => {
  // Find user by email or mobile, selecting password explicitly
  const user = await User.findOne({
    $or: [{ email: loginId.toLowerCase() }, { mobile: loginId }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid login credentials.', 401);
  }

  // Check account status
  if (user.status === 'pending') {
    throw new AppError('Your account is pending KYC document verification and approval by Admin.', 403);
  } else if (user.status !== 'active') {
    throw new AppError(`Your account is currently ${user.status}. Please contact support.`, 403);
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAndPersistTokens(user._id, deviceInfo);

  user.password = undefined;

  return { user, accessToken, refreshToken };
};

/**
 * Service to rotate refresh token
 */
export const refreshToken = async (token, deviceInfo = {}) => {
  if (!token) {
    throw new AppError('Refresh token is required.', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (_err) {
    throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  let tokenDoc = await RefreshToken.findOne({ token: hashedToken });

  // 1. Dynamic Migration Fallback:
  // If the JWT verifies successfully but is not in the database, the user session originated
  // before the database-backed security system. We dynamically migrate their session.
  if (!tokenDoc) {
    logger.info(`Migrating active legacy session dynamically for User ${decoded.id}`);
    tokenDoc = await RefreshToken.create({
      token: hashedToken,
      userId: decoded.id,
      expiresAt: new Date(decoded.exp * 1000), // use original JWT expiration timestamp
      device: {
        ip: deviceInfo.ip || '',
        userAgent: deviceInfo.userAgent || '',
      },
    });
  }

  // 2. Stolen Token Reuse Protection:
  // If a refresh token is presented but is already marked as revoked (e.g. rotated), it is
  // a strong indicator of a replay attack / token compromise. Immediately revoke all sessions.
  if (tokenDoc.isRevoked) {
    await RefreshToken.updateMany(
      { userId: tokenDoc.userId },
      { isRevoked: true, revokedReason: 'compromised_by_reuse' }
    );
    logger.warn(`Security Warning: Refresh token reuse detected for User ${tokenDoc.userId}! Revoking all active sessions.`);
    throw new AppError('Security violation: Session compromised. Please log in again.', 401);
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user || user.status !== 'active') {
    throw new AppError('User belonging to this token no longer exists or is inactive.', 401);
  }

  // 3. Token Rotation (RTR):
  // Generate a brand new access and refresh token pair
  const newTokens = await generateAndPersistTokens(user._id, deviceInfo);
  const newHashed = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');

  // Mark old token as rotated and link to new one
  tokenDoc.isRevoked = true;
  tokenDoc.revokedReason = 'rotated';
  tokenDoc.replacedByToken = newHashed;
  await tokenDoc.save();

  logger.info(`Session rotated successfully for User ${user._id}`);

  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  };
};

/**
 * Service to request password reset OTP
 */
export const forgotPassword = async (identifier) => {
  // 1. Find user by email or mobile
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
  });

  // To prevent account enumeration, if user is not found, return success response
  if (!user) {
    return { message: 'If that account is registered, a password reset link/OTP has been sent.' };
  }

  // 2. Generate a secure 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Hash the OTP using SHA-256 and store in User model
  const hashedToken = crypto.createHash('sha256').update(otpCode).digest('hex');
  user.passwordResetToken = hashedToken;
  // Expire in 10 minutes
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  // 4. Construct email payload
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${otpCode}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #0A3324; border-bottom: 2px solid #0A3324; padding-bottom: 10px;">Agriport Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>We received a request to reset the password for your Agriport account. Please use the following 6-digit Verification Code (OTP) to reset your password:</p>
      <div style="font-size: 24px; font-weight: bold; background: #f4f6f8; padding: 15px; text-align: center; border-radius: 5px; letter-spacing: 5px; margin: 20px 0; color: #0A3324;">
        ${otpCode}
      </div>
      <p>Alternatively, you can reset your password directly by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #0A3324; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Reset Password</a>
      </div>
      <p>Note: This code and link will expire in 10 minutes. If you did not request this, please ignore this email or contact support if you have concerns.</p>
      <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">Best regards,<br />Team Agriport</p>
    </div>
  `;

  // Emit password.reset_requested event
  eventBus.emit('password.reset_requested', { user, otpCode, resetUrl });

  return { message: 'If that account is registered, a password reset link/OTP has been sent.' };
};

/**
 * Service to reset password using OTP
 */
export const resetPassword = async (token, password) => {
  // 1. Hash the token/OTP to compare with the one in DB
  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  // 2. Find user with this token and ensure token is not expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) {
    throw new AppError('Password reset code is invalid or has expired.', 400);
  }

  // 3. Update password (will be automatically hashed by pre-save middleware)
  user.password = password;
  // 4. Clear reset token and expiration fields
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return { message: 'Password has been reset successfully.' };
};

/**
 * Service to invalidate session/token on logout
 */
export const logout = async (token) => {
  if (!token) return;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const result = await RefreshToken.deleteOne({ token: hashedToken });
  if (result.deletedCount > 0) {
    logger.info('Refresh token invalidated successfully on logout.');
  }
};

