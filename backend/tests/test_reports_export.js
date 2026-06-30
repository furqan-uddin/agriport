import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import env from '../src/config/env.js';

const testAdminEmail = 'test_admin_reports@agriport.in';
const testAdminMobile = '9999933333';
const testAdminPassword = 'SecureAdminPassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up test admin user...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up any stale data from previous test runs
  await User.deleteOne({ email: testAdminEmail });
  await User.deleteOne({ mobile: testAdminMobile });

  console.log('✅ Cleaned up old test records.');

  // Create a test admin user directly in DB
  const adminUser = await User.create({
    name: 'Test Admin Reports User',
    email: testAdminEmail,
    mobile: testAdminMobile,
    password: testAdminPassword,
    role: 'admin',
    status: 'active',
  });
  console.log('✅ Admin user created with ID:', adminUser._id);

  // Disconnect so we don't hold the DB connection open during network requests
  await mongoose.disconnect();

  // Log in to get the JWT Access Token
  console.log('\n2️⃣ Logging in to obtain Access Token...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: testAdminEmail,
      password: testAdminPassword,
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginData.message}`);
  }
  const accessToken = loginData.data.accessToken;
  console.log('🔑 Received Access Token:', accessToken.substring(0, 20) + '...');

  // Helper to fetch report
  const testReport = async (type, expectedHeaders) => {
    console.log(`\n📊 Requesting "${type}" report...`);
    const res = await fetch(`http://localhost:5000/api/v1/reports/export?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to export "${type}" report. Status: ${res.status}. Body: ${errBody}`);
    }

    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');
    const text = await res.text();

    console.log(`- Status: ${res.status}`);
    console.log(`- Content-Type: ${contentType}`);
    console.log(`- Content-Disposition: ${contentDisposition}`);
    
    if (!contentType || !contentType.includes('text/csv')) {
      throw new Error(`Expected text/csv content type, got: ${contentType}`);
    }
    
    if (!contentDisposition || !contentDisposition.includes(`attachment; filename="${type}_report_`)) {
      throw new Error(`Expected content disposition attachment filename format, got: ${contentDisposition}`);
    }

    const firstLine = text.split('\n')[0].trim();
    const expectedHeaderStr = expectedHeaders.join(',');
    
    if (firstLine !== expectedHeaderStr) {
      throw new Error(`CSV headers mismatch.\nExpected: ${expectedHeaderStr}\nGot:      ${firstLine}`);
    }

    console.log(`✅ "${type}" report validated successfully! Header: ${firstLine}`);
  };

  // 1. Orders Report
  await testReport('orders', [
    'Order Reference', 'Customer Name', 'Company Name', 'Phone', 'City', 'Subtotal', 'Tax', 'Shipping', 'Total', 'Order Status', 'Payment Status', 'Date'
  ]);

  // 2. Products Report
  await testReport('products', [
    'SKU', 'Product Name', 'Category', 'Stock', 'Unit', 'Status', 'Is Archived'
  ]);

  // 3. Users Report
  await testReport('users', [
    'Name', 'Email', 'Mobile', 'Role', 'Status', 'KYC Verified', 'Joined Date'
  ]);

  // 4. Sales Report
  await testReport('sales', [
    'Name', 'Email', 'Mobile', 'Role', 'Status', 'Region', 'Sales Target', 'Joined Date'
  ]);

  // 5. Test validation error (invalid type)
  console.log('\n🚫 Requesting invalid report type...');
  const invalidRes = await fetch('http://localhost:5000/api/v1/reports/export?type=invalid_type', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  console.log(`- Status: ${invalidRes.status}`);
  if (invalidRes.status !== 400) {
    throw new Error(`Expected status 400 for invalid report type, got ${invalidRes.status}`);
  }
  const invalidBody = await invalidRes.json();
  console.log('✅ Invalid type request correctly rejected with:', invalidBody.message);

  // Cleanup
  console.log('\n🧹 Cleaning up test database records...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteOne({ email: testAdminEmail });
  await User.deleteOne({ mobile: testAdminMobile });
  await mongoose.disconnect();

  console.log('\n🎉 ALL REPORT EXPORT TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Try cleanup just in case
  try {
    await mongoose.connect(env.MONGO_URI);
    await User.deleteOne({ email: testAdminEmail });
    await User.deleteOne({ mobile: testAdminMobile });
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.error('Could not clean up DB records:', cleanErr);
  }
  process.exit(1);
});
