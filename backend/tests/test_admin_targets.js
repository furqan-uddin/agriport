import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import env from '../src/config/env.js';

const ADMIN_EMAIL = 'admin_target_test@agriport.in';
const MANAGER_EMAIL = 'mgr_target_test@agriport.in';
const EXECUTIVE_EMAIL = 'exec_target_test@agriport.in';
const PASSWORD = 'Password123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean up and seed...');
  await mongoose.connect(env.MONGO_URI);
  // 1. Clean up old test data
  await User.deleteMany({
    $or: [
      { email: { $in: [ADMIN_EMAIL, MANAGER_EMAIL, EXECUTIVE_EMAIL] } },
      { mobile: { $in: ['9000000001', '9000000002', '9000000003'] } }
    ]
  });

  console.log('✅ Cleaned up old test records.');

  // 2. Seed Admin, Manager, and Executive
  const admin = await User.create({
    name: 'Target Test Admin',
    email: ADMIN_EMAIL,
    mobile: '9000000001',
    password: PASSWORD,
    role: 'admin',
    status: 'active',
  });

  const manager = await User.create({
    name: 'Target Test Manager',
    email: MANAGER_EMAIL,
    mobile: '9000000002',
    password: PASSWORD,
    role: 'manager',
    status: 'active',
    region: 'North',
    target: 500000,
  });
  const executive = await User.create({
    name: 'Target Test Executive',
    email: EXECUTIVE_EMAIL,
    mobile: '9000000003',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'North',
    managerId: manager._id,
    target: 150000,
    aadhaarUrl: '/uploads/aadhaar.pdf',
    panUrl: '/uploads/pan.pdf',
  });
  console.log('✅ Seeded users successfully.');

  // 3. Log in Admin to retrieve token
  console.log('\n🔑 Logging in Admin...');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: ADMIN_EMAIL, password: PASSWORD }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminLoginData));
  const adminToken = adminLoginData.data.accessToken;
  console.log('✅ Admin logged in successfully.');

  // 4. Update Manager Target
  console.log(`\n🎯 Updating target for Manager: ${manager.name} (${manager._id}) to ₹600,000...`);
  const updateMgrTargetRes = await fetch(`http://localhost:5000/api/v1/users/admin/sales/users/${manager._id}/target`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ target: 600000 }),
  });
  const updateMgrTargetData = await updateMgrTargetRes.json();
  if (!updateMgrTargetRes.ok) throw new Error('Failed to update manager target: ' + JSON.stringify(updateMgrTargetData));
  
  // Verify in DB
  const updatedManager = await User.findById(manager._id);
  if (updatedManager.target !== 600000) {
    throw new Error(`Manager target mismatch! Expected 600000, got ${updatedManager.target}`);
  }
  console.log(`✅ Manager target updated successfully in DB to: ₹${updatedManager.target}`);

  // 5. Update Executive Target
  console.log(`\n🎯 Updating target for Executive: ${executive.name} (${executive._id}) to ₹200,000...`);
  const updateExecTargetRes = await fetch(`http://localhost:5000/api/v1/users/admin/sales/users/${executive._id}/target`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ target: 200000 }),
  });
  const updateExecTargetData = await updateExecTargetRes.json();
  if (!updateExecTargetRes.ok) throw new Error('Failed to update executive target: ' + JSON.stringify(updateExecTargetData));
  
  // Verify in DB
  const updatedExecutive = await User.findById(executive._id);
  if (updatedExecutive.target !== 200000) {
    throw new Error(`Executive target mismatch! Expected 200000, got ${updatedExecutive.target}`);
  }
  console.log(`✅ Executive target updated successfully in DB to: ₹${updatedExecutive.target}`);

  // 6. Test negative/invalid target error handling
  console.log('\n⚠️ Verifying error handling for negative target...');
  const badTargetRes = await fetch(`http://localhost:5000/api/v1/users/admin/sales/users/${executive._id}/target`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ target: -50 }),
  });
  const badTargetData = await badTargetRes.json();
  if (badTargetRes.ok) {
    throw new Error('Negative target was accepted when it should have failed!');
  }
  console.log(`✅ Correctly rejected invalid target. Server response: "${badTargetData.message}"`);

  // 7. Get Admin Executives list
  console.log('\n📋 Fetching Admin Executives list...');
  const getExecsRes = await fetch('http://localhost:5000/api/v1/users/admin/sales/executives', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  const getExecsData = await getExecsRes.json();
  if (!getExecsRes.ok) throw new Error('Failed to fetch admin executives list: ' + JSON.stringify(getExecsData));
  
  const fetchedExec = getExecsData.data.find(e => e.id === executive._id.toString());
  if (!fetchedExec) {
    throw new Error('Test executive not found in fetched executives roster!');
  }
  if (fetchedExec.target !== 200000) {
    throw new Error(`Fetched target mismatch! Expected 200000, got ${fetchedExec.target}`);
  }
  if (fetchedExec.managerName !== manager.name) {
    throw new Error(`Fetched managerName mismatch! Expected ${manager.name}, got ${fetchedExec.managerName}`);
  }
  console.log(`✅ Exec list verify success! Target: ₹${fetchedExec.target}, Manager: ${fetchedExec.managerName}`);

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await User.deleteMany({
    email: { $in: [ADMIN_EMAIL, MANAGER_EMAIL, EXECUTIVE_EMAIL] }
  });
  console.log('✅ Cleanup complete.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
};

runTest()
  .then(() => {
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    mongoose.connection.close();
    process.exit(1);
  });
