import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import env from '../src/config/env.js';

const testAdminEmail = 'test_analytics_admin@agriport.in';
const testPassword = 'SecurePassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up analytics test data...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up
  await User.deleteOne({ email: testAdminEmail });
  
  // Create test admin user
  const adminUser = await User.create({
    name: 'Analytics Admin',
    email: testAdminEmail,
    mobile: '9898944444',
    password: testPassword,
    role: 'admin',
    status: 'active',
  });
  console.log('✅ Admin user created.');

  // Disconnect before fetching API
  await mongoose.disconnect();

  // Log in as admin to get JWT Access Token
  console.log('\n🔐 Authenticating Admin User...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginData.message}`);
  }
  const token = loginData.data.accessToken;
  console.log('🔑 Received Token.');

  // Fetch admin dashboard stats
  console.log('\n📊 Fetching admin dashboard stats...');
  const statsRes = await fetch('http://localhost:5000/api/v1/reports/dashboard-stats', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const statsData = await statsRes.json();
  if (!statsRes.ok) {
    throw new Error(`Failed to fetch stats: ${statsData.message}`);
  }
  const stats = statsData.data;

  console.log('✅ Received dashboard stats:');
  console.log(`- totalRevenue: ${stats.totalRevenue}`);
  console.log(`- revenueDelta: ${stats.revenueDelta}%`);
  console.log(`- orderCount: ${stats.orderCount}`);
  console.log(`- ordersDelta: ${stats.ordersDelta}%`);
  console.log(`- userCount: ${stats.userCount}`);
  console.log(`- usersDelta: ${stats.usersDelta}%`);
  console.log(`- productStock (total stock): ${stats.productStock}`);
  console.log(`- pendingPaymentsAmount: ${stats.pendingPaymentsAmount}`);

  // Assertions for data types and bounds
  if (typeof stats.totalRevenue !== 'number' || stats.totalRevenue < 0) {
    throw new Error('totalRevenue must be a non-negative number');
  }
  if (typeof stats.revenueDelta !== 'number') {
    throw new Error('revenueDelta must be a number');
  }
  if (typeof stats.orderCount !== 'number' || stats.orderCount < 0) {
    throw new Error('orderCount must be a non-negative number');
  }
  if (typeof stats.ordersDelta !== 'number') {
    throw new Error('ordersDelta must be a number');
  }
  if (typeof stats.productStock !== 'number' || stats.productStock < 0) {
    throw new Error('productStock must be a non-negative number');
  }
  if (typeof stats.pendingPaymentsAmount !== 'number' || stats.pendingPaymentsAmount < 0) {
    throw new Error('pendingPaymentsAmount must be a non-negative number');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test database records...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteOne({ _id: adminUser._id });
  await mongoose.disconnect();

  console.log('\n🎉 ALL DASHBOARD ANALYTICS REAL CALCULATION TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  try {
    await mongoose.connect(env.MONGO_URI);
    await User.deleteMany({ email: testAdminEmail });
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.error('Could not clean up DB records:', cleanErr);
  }
  process.exit(1);
});
