import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import OTP from '../src/modules/auth/otp.model.js';
import env from '../src/config/env.js';
import { sendOtp, verifyOtp } from '../src/modules/auth/auth.service.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  const testMobile = '9999966666';
  await User.deleteMany({ mobile: testMobile });
  await OTP.deleteMany({ mobile: testMobile });

  console.log(`USE_MOCK_OTP env configuration is: ${env.USE_MOCK_OTP}`);
  if (env.USE_MOCK_OTP !== true) {
    throw new Error('USE_MOCK_OTP must be set to true in .env for this test!');
  }

  // 1. Test Mock OTP generation
  console.log('🌱 Sending mock OTP for registration...');
  const sendResult = await sendOtp(testMobile, 'signup');
  console.log('   Send Result:', sendResult);

  const latestOtp = await OTP.findOne({ mobile: testMobile }).sort({ createdAt: -1 });
  console.log('   Generated OTP Code (Expected 123456):', latestOtp.otpCode);
  if (latestOtp.otpCode !== '123456') {
    throw new Error('Mock OTP code was not generated as 123456!');
  }

  // 2. Test Verification with purpose mismatch
  console.log('🌱 Verifying OTP with purpose mismatch (checking if "login" purpose rejects a "signup" OTP)...');
  try {
    await verifyOtp(testMobile, '123456', 'login');
    throw new Error('Verification succeeded even with purpose mismatch!');
  } catch (err) {
    console.log('   Rejected (as expected!):', err.message);
    if (!err.message.includes('expired or does not exist')) {
      throw new Error(`Unexpected error message: ${err.message}`);
    }
  }

  // 3. Test Verification with correct purpose
  console.log('🌱 Verifying OTP with correct purpose ("signup")...');
  const verifyResult = await verifyOtp(testMobile, '123456', 'signup');
  console.log('   Verify Result:', verifyResult);
  if (verifyResult.verified !== true) {
    throw new Error('Verification failed for correct purpose!');
  }

  // Clean up
  await OTP.deleteMany({ mobile: testMobile });
  await mongoose.disconnect();
  console.log('🎉 ALL MOCK OTP AND PURPOSE TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
