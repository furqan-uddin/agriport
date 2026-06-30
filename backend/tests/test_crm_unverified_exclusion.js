import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import env from '../src/config/env.js';

const EXEC_EMAIL = 'test_crm_exec_filter@agriport.in';
const PASSWORD = 'SecurePassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up
  const testExecMobile = '9999944444';
  const pendingCustomerMobile = '9999933333';
  const manualCustomerMobile = '9999922222';

  await User.deleteMany({ $or: [{ email: EXEC_EMAIL }, { mobile: pendingCustomerMobile }] });
  await CRMCustomer.deleteMany({ phone: { $in: [pendingCustomerMobile, manualCustomerMobile] } });

  // Create executive
  const executive = await User.create({
    name: 'Test CRM Executive Filter',
    email: EXEC_EMAIL,
    mobile: testExecMobile,
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'West',
    aadhaarUrl: '/uploads/dummy_aadhaar.png',
    panUrl: '/uploads/dummy_pan.png',
  });

  // Log in executive
  console.log('🔑 Logging in executive...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: EXEC_EMAIL, password: PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error('Executive login failed');
  const accessToken = loginData.data.accessToken;

  // 1. Create a platform user with status pending
  console.log('🌱 Creating a pending platform customer user...');
  const pendingUser = await User.create({
    name: 'Pending Test Customer',
    email: 'pending_cust_test@agriport.in',
    mobile: pendingCustomerMobile,
    password: PASSWORD,
    role: 'customer',
    status: 'pending',
    companyName: 'Pending Inc',
    city: 'Pune',
    businessType: 'Retailer',
  });

  // 2. Create a manual CRM Customer (platformUserId = null)
  console.log('🌱 Creating a manual CRM customer lead (platformUserId = null)...');
  const manualCrmCust = await CRMCustomer.create({
    name: 'Manual Crm Customer',
    company: 'Manual Inc',
    phone: manualCustomerMobile,
    city: 'Pune',
    stage: 'lead',
    platformUserId: null,
  });

  // 3. Retrieve customers list via API
  console.log('📋 Fetching CRM customers list via API...');
  const getCrmRes = await fetch('http://localhost:5000/api/v1/crm/customers', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const crmData = await getCrmRes.json();
  if (!getCrmRes.ok) throw new Error(`GET /crm/customers failed: ${JSON.stringify(crmData)}`);

  const fetchedCustomers = crmData.data;
  console.log(`Fetched ${fetchedCustomers.length} CRM Customers.`);

  const hasPending = fetchedCustomers.some(c => c.phone === pendingCustomerMobile);
  const hasManual = fetchedCustomers.some(c => c.phone === manualCustomerMobile);

  console.log(`   Pending customer in list? ${hasPending} (Expected: false)`);
  console.log(`   Manual offline customer in list? ${hasManual} (Expected: true)`);

  if (hasPending) {
    throw new Error('Pending/unverified customer was visible in the CRM list!');
  }
  if (!hasManual) {
    throw new Error('Manual offline customer was hidden from the CRM list!');
  }

  // 4. Activate the pending user
  console.log('🌱 Activating the pending platform customer user...');
  pendingUser.status = 'active';
  await pendingUser.save();

  // Fetch customers list again
  console.log('📋 Fetching CRM customers list again...');
  const getCrmRes2 = await fetch('http://localhost:5000/api/v1/crm/customers', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const crmData2 = await getCrmRes2.json();
  const fetchedCustomers2 = crmData2.data;

  // Since it syncs active missing platform users, it should now sync and return it!
  const hasPendingNow = fetchedCustomers2.some(c => c.phone === pendingCustomerMobile);
  console.log(`   Active customer in list? ${hasPendingNow} (Expected: true)`);

  if (!hasPendingNow) {
    throw new Error('Active/verified customer was not visible in the CRM list!');
  }

  // Clean up
  await User.deleteMany({ $or: [{ email: EXEC_EMAIL }, { mobile: pendingCustomerMobile }] });
  await CRMCustomer.deleteMany({ phone: { $in: [pendingCustomerMobile, manualCustomerMobile] } });
  await mongoose.disconnect();
  console.log('🎉 CRM UNVERIFIED EXCLUSION TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
