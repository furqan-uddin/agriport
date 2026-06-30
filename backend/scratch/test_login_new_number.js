import mongoose from 'mongoose';
import env from '../src/config/env.js';
import { sendOtp } from '../src/modules/auth/auth.service.js';
import User from '../src/modules/users/user.model.js';

const runTest = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  const testMobile = '9999955555';
  await User.deleteMany({ mobile: testMobile });

  console.log(`\nTesting sendOtp for new number ${testMobile} with purpose: 'login'`);
  try {
    const result = await sendOtp(testMobile, 'login');
    console.log('❌ SUCCESS! OTP sent:', result);
  } catch (err) {
    console.log('✅ FAILED (As expected!):', err.statusCode, err.message);
  }

  await mongoose.disconnect();
};

runTest();
