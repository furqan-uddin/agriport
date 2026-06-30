import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import FollowUp from '../src/modules/crm/followUp.model.js';
import env from '../src/config/env.js';

const EXEC_EMAIL = 'test_crm_executive@agriport.in';
const PASSWORD = 'SecurePassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean up and seed...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: EXEC_EMAIL });
  await User.deleteMany({ mobile: '8888887777' });
  await CRMCustomer.deleteMany({});
  await FollowUp.deleteMany({});
  console.log('✅ Cleaned up old test records.');

  // 2. Seed Executive
  const executive = await User.create({
    name: 'Test CRM Executive',
    email: EXEC_EMAIL,
    mobile: '8888887777',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'West',
    aadhaarUrl: '/uploads/dummy_aadhaar.png',
    panUrl: '/uploads/dummy_pan.png',
  });
  console.log('✅ Seeded CRM executive user successfully.');

  // 3. Log in Executive to retrieve token
  console.log('\n🔑 Logging in Executive...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: EXEC_EMAIL, password: PASSWORD }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error('Executive login failed');
  const accessToken = loginData.data.accessToken;
  console.log('✅ Executive logged in successfully.');

  // 4. Test POST /crm/customers (Executive only)
  console.log('\n👤 Testing POST /crm/customers...');
  const newCustomer = {
    name: 'Jane Wholesaler',
    company: 'Jane Agri Industries',
    phone: '+91 9999888877',
    city: 'Pune',
    gst: '27AAAAA1111A1Z2',
  };
  const postCustRes = await fetch('http://localhost:5000/api/v1/crm/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(newCustomer),
  });
  const postCustData = await postCustRes.json();
  if (!postCustRes.ok) throw new Error(`POST /crm/customers failed: ${JSON.stringify(postCustData)}`);
  console.log('✅ POST /crm/customers response: SUCCESS');
  const crmCustomerId = postCustData.data._id;
  console.log(`✅ CRM Customer created with ID: ${crmCustomerId}`);

  // 5. Test GET /crm/customers
  console.log('\n📋 Testing GET /crm/customers...');
  const getCustsRes = await fetch('http://localhost:5000/api/v1/crm/customers', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const getCustsData = await getCustsRes.json();
  if (!getCustsRes.ok) throw new Error(`GET /crm/customers failed: ${JSON.stringify(getCustsData)}`);
  console.log('✅ GET /crm/customers response: SUCCESS');
  if (getCustsData.data.length !== 1 || getCustsData.data[0].name !== 'Jane Wholesaler') {
    throw new Error('CRM Customer list mismatch or missing record');
  }

  // 6. Test PATCH /crm/customers/:id
  console.log('\n📝 Testing PATCH /crm/customers/:id...');
  const patchCustRes = await fetch(`http://localhost:5000/api/v1/crm/customers/${crmCustomerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ stage: 'prospect', city: 'Mumbai' }),
  });
  const patchCustData = await patchCustRes.json();
  if (!patchCustRes.ok) throw new Error(`PATCH /crm/customers/:id failed: ${JSON.stringify(patchCustData)}`);
  console.log('✅ PATCH /crm/customers/:id response: SUCCESS');
  if (patchCustData.data.stage !== 'prospect' || patchCustData.data.city !== 'Mumbai') {
    throw new Error('CRM Customer fields not updated correctly');
  }

  // 7. Test POST /crm/follow-ups
  console.log('\n📅 Testing POST /crm/follow-ups...');
  const newFollowUp = {
    crmCustomerId,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // due in 1 day
    type: 'call',
    note: 'Initial intro call scheduled.',
  };
  const postFURes = await fetch('http://localhost:5000/api/v1/crm/follow-ups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(newFollowUp),
  });
  const postFUData = await postFURes.json();
  if (!postFURes.ok) throw new Error(`POST /crm/follow-ups failed: ${JSON.stringify(postFUData)}`);
  console.log('✅ POST /crm/follow-ups response: SUCCESS');
  const followUpId = postFUData.data._id;
  console.log(`✅ Follow-up created with ID: ${followUpId}`);

  // 8. Test GET /crm/follow-ups
  console.log('\n📋 Testing GET /crm/follow-ups...');
  const getFUsRes = await fetch('http://localhost:5000/api/v1/crm/follow-ups', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const getFUsData = await getFUsRes.json();
  if (!getFUsRes.ok) throw new Error(`GET /crm/follow-ups failed: ${JSON.stringify(getFUsData)}`);
  console.log('✅ GET /crm/follow-ups response: SUCCESS');
  if (getFUsData.data.length !== 1 || getFUsData.data[0].type !== 'call') {
    throw new Error('Follow-up list mismatch or missing record');
  }

  // 9. Test PATCH /crm/follow-ups/:id
  console.log('\n✅ Testing PATCH /crm/follow-ups/:id...');
  const patchFURes = await fetch(`http://localhost:5000/api/v1/crm/follow-ups/${followUpId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ isDone: true, note: 'Call completed successfully.' }),
  });
  const patchFUData = await patchFURes.json();
  if (!patchFURes.ok) throw new Error(`PATCH /crm/follow-ups/:id failed: ${JSON.stringify(patchFUData)}`);
  console.log('✅ PATCH /crm/follow-ups/:id response: SUCCESS');
  if (!patchFUData.data.isDone || patchFUData.data.note !== 'Call completed successfully.') {
    throw new Error('Follow-up fields not updated correctly');
  }

  // 9b. Test DELETE /crm/follow-ups/:id
  console.log('\n🗑️ Testing DELETE /crm/follow-ups/:id...');
  const deleteFURes = await fetch(`http://localhost:5000/api/v1/crm/follow-ups/${followUpId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  const deleteFUData = await deleteFURes.json();
  if (!deleteFURes.ok) throw new Error(`DELETE /crm/follow-ups/:id failed: ${JSON.stringify(deleteFUData)}`);
  console.log('✅ DELETE /crm/follow-ups/:id response: SUCCESS');

  // 10. Test Authorization constraints (should reject without token)
  console.log('\n🚫 Testing GET /crm/customers (Unauthorized request check)...');
  const failRes = await fetch('http://localhost:5000/api/v1/crm/customers');
  if (failRes.status !== 401) {
    throw new Error(`Expected status 401 for unauthorized GET request, got ${failRes.status}`);
  }
  console.log('✅ Unauthorized request correctly rejected (401).');

  // Clean up database records
  await User.deleteOne({ _id: executive._id });
  await CRMCustomer.deleteMany({});
  await FollowUp.deleteMany({});
  console.log('🧹 Cleaned up CRM test records.');

  console.log('\n🎉 ALL CRM SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
