import fs from 'fs';
import path from 'path';

// Clean up previous test users in MongoDB if any
import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import OTP from '../src/modules/auth/otp.model.js';
import env from '../src/config/env.js';

const testMobile = '9876543210';
const testEmail = 'test_customer@agriport.in';
const testPassword = 'SecurePassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean up test data...');
  await mongoose.connect(env.MONGO_URI);
  
  // Clean up previous runs
  await User.deleteOne({ email: testEmail });
  await User.deleteOne({ mobile: testMobile });
  await OTP.deleteMany({ mobile: testMobile });
  console.log('✅ Cleaned up old test records.');

  const logFilePath = 'C:\\Users\\RCom\\.gemini\\antigravity\\brain\\fe56d8ae-7825-477d-8ed8-82e8f4f79b6e\\.system_generated\\tasks\\task-337.log';

  // 1. Send OTP
  console.log('\n1️⃣ Requesting OTP...');
  const sendOtpRes = await fetch('http://localhost:5000/api/v1/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: testMobile, purpose: 'signup' }),
  });
  const sendOtpData = await sendOtpRes.json();
  console.log('Response:', sendOtpData);

  if (!sendOtpRes.ok) {
    throw new Error('Send OTP failed');
  }

  // Give logger a split second to write to file
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 2. Extract OTP from Winston log file
  console.log('\n2️⃣ Extracting OTP from logs...');
  const logs = fs.readFileSync(logFilePath, 'utf8');
  const matches = [...logs.matchAll(/Your Agriport OTP code for signup is (\d{6})/g)];
  
  if (matches.length === 0) {
    throw new Error('Failed to find OTP code in logs!');
  }
  const otpCode = matches[matches.length - 1][1];
  console.log(`🔑 Extracted OTP Code: ${otpCode}`);

  // 3. Verify OTP
  console.log('\n3️⃣ Verifying OTP...');
  const verifyRes = await fetch('http://localhost:5000/api/v1/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: testMobile, otpCode }),
  });
  const verifyData = await verifyRes.json();
  console.log('Response:', verifyData);

  if (!verifyRes.ok) {
    throw new Error('OTP verification failed');
  }

  // 4. Signup Customer
  console.log('\n4️⃣ Registering Customer...');
  const signupRes = await fetch('http://localhost:5000/api/v1/auth/signup/customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe Wholesaler',
      email: testEmail,
      mobile: testMobile,
      password: testPassword,
      companyName: 'Doe Agricultural Farms Ltd',
      gstNumber: '27AAAAA1111A1Z1',
      city: 'Pune',
      businessType: 'Wholesaler',
    }),
  });
  const signupData = await signupRes.json();
  console.log('Response:', signupData);

  if (!signupRes.ok) {
    throw new Error('Signup failed');
  }

  // Keep track of refresh token cookie from headers
  const setCookieHeader = signupRes.headers.get('set-cookie');
  console.log('Cookie received:', setCookieHeader);

  // 5. Login
  console.log('\n5️⃣ Logging in...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('Response:', loginData);

  if (!loginRes.ok) {
    throw new Error('Login failed');
  }
  const loginCookie = loginRes.headers.get('set-cookie');
  const parsedCookie = loginCookie ? loginCookie.split(';')[0] : '';
  console.log('Login cookie received:', parsedCookie);

  // 6. Refresh Token
  console.log('\n6️⃣ Refreshing Access Token...');
  const refreshRes = await fetch('http://localhost:5000/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': parsedCookie, // send the refreshToken cookie
    },
    body: JSON.stringify({}),
  });
  const refreshData = await refreshRes.json();
  console.log('Response:', refreshData);

  if (!refreshRes.ok) {
    throw new Error('Token refresh failed');
  }

  // 7. Logout
  console.log('\n7️⃣ Logging out...');
  const logoutRes = await fetch('http://localhost:5000/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Cookie': parsedCookie,
    },
  });
  const logoutData = await logoutRes.json();
  console.log('Response:', logoutData);

  if (!logoutRes.ok) {
    throw new Error('Logout failed');
  }

  // 8. Executive Signup (Multipart Form Data with files)
  console.log('\n8️⃣ Testing Executive Registration (KYC upload)...');
  const execMobile = '9999988888';
  const execEmail = 'test_exec@agriport.in';
  
  // Clean up any old exec
  await User.deleteOne({ email: execEmail });
  await User.deleteOne({ mobile: execMobile });

  const formData = new FormData();
  formData.append('name', 'Jane Executive');
  formData.append('email', execEmail);
  formData.append('mobile', execMobile);
  formData.append('password', 'SecurePassword123');
  formData.append('region', 'North');
  formData.append('target', '150000');
  
  // Create mock files using Blobs with correct MIME types
  const aadhaarBlob = new Blob(['mock aadhaar card data'], { type: 'application/pdf' });
  const panBlob = new Blob(['mock pan card data'], { type: 'image/png' });
  
  formData.append('aadhaarCard', aadhaarBlob, 'aadhaar.pdf');
  formData.append('panCard', panBlob, 'pan.png');

  const execRes = await fetch('http://localhost:5000/api/v1/auth/signup/executive', {
    method: 'POST',
    body: formData, // fetch will auto-set correct multipart/form-data headers
  });
  const execData = await execRes.json();
  console.log('Response:', execData);

  if (!execRes.ok) {
    throw new Error('Executive signup failed');
  }

  // Double check that user was created in DB with pending status and kyc URLs saved
  const createdExec = await User.findOne({ email: execEmail });
  if (!createdExec) {
    throw new Error('Executive record not found in MongoDB!');
  }
  console.log('Verified Exec DB Document status:', createdExec.status);
  console.log('Aadhaar URL saved:', createdExec.aadhaarUrl);
  console.log('PAN URL saved:', createdExec.panUrl);

  // Clean up uploaded test files from local uploads folder if they exist
  if (createdExec.aadhaarUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), createdExec.aadhaarUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  if (createdExec.panUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), createdExec.panUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  // Clean up database records
  await User.deleteOne({ _id: createdExec._id });
  console.log('🧹 Cleaned up Executive test records.');

  console.log('\n🎉 ALL END-TO-END AUTH TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
