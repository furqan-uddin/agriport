import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import * as authService from '../src/modules/auth/auth.service.js';
import env from '../src/config/env.js';

const testEmail = 'reset_test@agriport.in';
const testMobile = '9999988888';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up & Create a test user
  console.log('🧹 Cleaning up old test user...');
  await User.deleteOne({ email: testEmail });
  
  console.log('👤 Creating a test user...');
  await User.create({
    name: 'Reset Test User',
    email: testEmail,
    mobile: testMobile,
    password: 'OldPassword123!',
    role: 'customer',
    companyName: 'Test Corp',
    city: 'Pune',
    businessType: 'Wholesaler',
  });
  console.log('✅ Created test user with password "OldPassword123!"');

  // 2. Mock Math.random to get a predictable OTP
  console.log('🎲 Mocking Math.random to generate a predictable OTP...');
  const originalRandom = Math.random;
  Math.random = () => 0.123456; 
  // Formula: Math.floor(100000 + 0.123456 * 900000) = Math.floor(100000 + 111110.4) = 211110
  const expectedOtp = '211110';

  // 3. Call forgotPassword
  console.log('🔑 Requesting password reset...');
  const forgotRes = await authService.forgotPassword(testEmail);
  console.log('Response:', forgotRes);

  // Restore Math.random
  Math.random = originalRandom;

  // 4. Verify DB fields are populated
  const updatedUser = await User.findOne({ email: testEmail });
  console.log('DB passwordResetToken:', updatedUser.passwordResetToken);
  console.log('DB passwordResetExpires:', updatedUser.passwordResetExpires);
  if (!updatedUser.passwordResetToken || !updatedUser.passwordResetExpires) {
    throw new Error('❌ Reset token/expiry not saved to User in DB!');
  }
  console.log('✅ Hashed token and expiry successfully stored in database.');

  // 5. Try resetting with invalid OTP
  console.log('❌ Attempting reset with incorrect OTP...');
  try {
    await authService.resetPassword('111111', 'NewPassword123!');
    throw new Error('Should have failed with invalid OTP!');
  } catch (err) {
    console.log('✅ Successfully rejected invalid OTP:', err.message);
  }

  // 6. Reset with correct OTP
  console.log('✔️ Attempting reset with correct OTP "211110"...');
  const resetRes = await authService.resetPassword(expectedOtp, 'NewPassword123!');
  console.log('Response:', resetRes);

  // 7. Verify fields are cleared & password works
  const finalizedUser = await User.findOne({ email: testEmail }).select('+password');
  if (finalizedUser.passwordResetToken || finalizedUser.passwordResetExpires) {
    throw new Error('❌ Reset token/expiry fields were NOT cleared after successful reset!');
  }
  console.log('✅ Reset token and expiry fields successfully cleared (Single-Use enforced).');

  const passwordMatches = await finalizedUser.comparePassword('NewPassword123!');
  if (!passwordMatches) {
    throw new Error('❌ New password compare failed!');
  }
  console.log('✅ Successfully authenticated with new password "NewPassword123!".');

  // Clean up
  await User.deleteOne({ email: testEmail });
  console.log('🧹 Cleaned up test user.');
  
  await mongoose.disconnect();
  console.log('🎉 PASSWORD RESET SERVICE TEST PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
