import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../src/modules/users/user.model.js';
import RefreshToken from '../src/modules/auth/refreshToken.model.js';
import env from '../src/config/env.js';
import * as authService from '../src/modules/auth/auth.service.js';

const testEmail = 'security_test_user@agriport.in';
const testPassword = 'Password123!';
const testMobile = '9988776655';

const runSecurityTests = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  console.log('🧹 Cleaning up test data...');
  const user = await User.findOne({ $or: [{ email: testEmail }, { mobile: testMobile }] });
  if (user) {
    await RefreshToken.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }

  console.log('👤 Creating test user...');
  const testUser = await User.create({
    name: 'Security Test User',
    email: testEmail,
    mobile: testMobile,
    password: testPassword,
    role: 'customer',
    status: 'active',
  });

  const deviceInfo = {
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 SecurityTestRunner/1.0',
  };

  console.log('\n--- Test Case 1: Login & Persistence ---');
  const loginRes = await authService.login(testEmail, testPassword, deviceInfo);
  if (!loginRes.refreshToken) {
    throw new Error('Login response did not return a refresh token');
  }
  
  const hashedToken = crypto.createHash('sha256').update(loginRes.refreshToken).digest('hex');
  const dbToken = await RefreshToken.findOne({ token: hashedToken });
  if (!dbToken) {
    throw new Error('Hashed refresh token not found in the database after login');
  }
  console.log('✅ Hashed refresh token successfully persisted in database.');
  console.log('📝 Device tracking check - IP:', dbToken.device.ip, '| User-Agent:', dbToken.device.userAgent);

  console.log('\n--- Test Case 2: Refresh Token Rotation (RTR) ---');
  const refreshRes = await authService.refreshToken(loginRes.refreshToken, deviceInfo);
  if (!refreshRes.refreshToken || !refreshRes.accessToken) {
    throw new Error('Rotation did not return new tokens');
  }
  if (refreshRes.refreshToken === loginRes.refreshToken) {
    throw new Error('Refresh token was not rotated!');
  }
  console.log('✅ Token rotated successfully. Received new refresh token.');

  const oldDbToken = await RefreshToken.findOne({ token: hashedToken });
  if (!oldDbToken.isRevoked || oldDbToken.revokedReason !== 'rotated') {
    throw new Error('Old refresh token was not revoked or marked as rotated in database');
  }
  console.log('✅ Old token marked as rotated and revoked.');

  const newHashedToken = crypto.createHash('sha256').update(refreshRes.refreshToken).digest('hex');
  const newDbToken = await RefreshToken.findOne({ token: newHashedToken });
  if (!newDbToken) {
    throw new Error('New rotated refresh token was not found in the database');
  }
  console.log('✅ New rotated refresh token persisted in database.');

  console.log('\n--- Test Case 3: Replay / Stolen Token Reuse Protection ---');
  try {
    console.log('⚠️ Replaying the old (rotated) token to simulate theft...');
    await authService.refreshToken(loginRes.refreshToken, deviceInfo);
    throw new Error('Replayed token should have been rejected!');
  } catch (err) {
    if (err.statusCode !== 401 || !err.message.includes('Session compromised')) {
      throw err;
    }
    console.log('✅ Replay attack correctly rejected with 401 Session compromised.');
  }

  // Verify all tokens for this user are now revoked
  const activeCount = await RefreshToken.countDocuments({ userId: testUser._id, isRevoked: false });
  if (activeCount > 0) {
    throw new Error('Active refresh tokens still exist after reuse detection! Revocation failed.');
  }
  console.log('✅ All user sessions were successfully revoked upon detecting reuse.');

  console.log('\n--- Test Case 4: Logout Invalidation ---');
  // Log in again to get a fresh active token
  const freshLogin = await authService.login(testEmail, testPassword, deviceInfo);
  const freshHashed = crypto.createHash('sha256').update(freshLogin.refreshToken).digest('hex');
  
  const freshDbToken = await RefreshToken.findOne({ token: freshHashed });
  if (!freshDbToken) {
    throw new Error('Failed to create fresh session for logout test');
  }

  console.log('🚪 Logging out...');
  await authService.logout(freshLogin.refreshToken);

  const loggedOutDbToken = await RefreshToken.findOne({ token: freshHashed });
  if (loggedOutDbToken) {
    throw new Error('Token was not deleted/revoked from database on logout');
  }
  console.log('✅ Hashed token successfully removed from database on logout.');

  try {
    console.log('⚠️ Attempting to use logged-out token...');
    await authService.refreshToken(freshLogin.refreshToken, deviceInfo);
    throw new Error('Logged out token should have been rejected!');
  } catch (err) {
    console.log('✅ Logged-out token refresh correctly rejected.');
  }

  console.log('\n--- Cleanup ---');
  await User.deleteOne({ _id: testUser._id });
  console.log('🧹 Cleaned up user.');

  console.log('\n🎉 ALL SECURITY REFRESH TOKEN LIFECYCLE TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runSecurityTests().catch(async (err) => {
  console.error('\n❌ Test failed with error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
