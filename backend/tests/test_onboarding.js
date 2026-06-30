import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import { verifyUserKyc, assignManager } from '../src/modules/users/user.controller.js';
import eventBus from '../src/events/index.js';
import env from '../src/config/env.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  const testEmailPrefix = 'test_onboarding_' + Date.now();
  const customerEmail = `${testEmailPrefix}_cust@agriport.in`;
  const execEmail = `${testEmailPrefix}_exec@agriport.in`;
  const managerEmail = `${testEmailPrefix}_mgr@agriport.in`;

  console.log('🧹 Cleaning up old test data...');
  await User.deleteMany({ email: { $in: [customerEmail, execEmail, managerEmail] } });

  let customerEventFired = false;
  let executiveEventFired = false;

  eventBus.on('customer.approved', (user) => {
    console.log(`🔊 [Event Received] customer.approved for user: ${user.name}`);
    customerEventFired = true;
  });

  eventBus.on('executive.approved', (user) => {
    console.log(`🔊 [Event Received] executive.approved for user: ${user.name}`);
    executiveEventFired = true;
  });

  console.log('🌱 Step 1: Registering a customer...');
  const customer = await User.create({
    name: 'Test Customer Onboarding',
    email: customerEmail,
    mobile: '9999990001',
    password: 'Password123',
    role: 'customer',
    companyName: 'Onboard Biz',
    city: 'Pune',
    businessType: 'Wholesaler'
  });

  console.log(`   Customer created with status: "${customer.status}" (Expected: "pending")`);
  if (customer.status !== 'pending') {
    throw new Error('Customer status should default to pending!');
  }

  console.log('🌱 Step 2: Registering an executive...');
  const executive = await User.create({
    name: 'Test Executive Onboarding',
    email: execEmail,
    mobile: '9999990002',
    password: 'Password123',
    role: 'executive',
    region: 'North',
    aadhaarUrl: 'http://example.com/aadhaar.jpg',
    panUrl: 'http://example.com/pan.jpg'
  });

  console.log(`   Executive created with status: "${executive.status}" (Expected: "pending")`);
  if (executive.status !== 'pending') {
    throw new Error('Executive status should default to pending!');
  }

  console.log('🌱 Step 3: Registering a manager...');
  const manager = await User.create({
    name: 'Test Manager Onboarding',
    email: managerEmail,
    mobile: '9999990003',
    password: 'Password123',
    role: 'manager',
    region: 'North'
  });

  console.log('🌱 Step 4: Testing customer KYC verification (should auto-activate customer & fire event)...');
  
  let resData = null;
  let resolveResponse;
  let responsePromise;

  const resetPromise = () => {
    resData = null;
    responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });
  };

  const createMockRes = () => ({
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      resData = data;
      resolveResponse(data);
      return this;
    },
  });

  const mockNext = (err) => {
    if (err) {
      console.error('❌ Error passed to next():', err);
      resolveResponse(null);
      throw err;
    }
  };

  // Verify Customer KYC
  resetPromise();
  await verifyUserKyc({ params: { id: customer._id }, body: { kycVerified: true } }, createMockRes(), mockNext);
  await responsePromise;

  const activatedCust = await User.findById(customer._id);
  console.log(`   Activated Customer status: "${activatedCust.status}" (Expected: "active")`);
  console.log(`   Customer KYC Verified: "${activatedCust.kycVerified}" (Expected: true)`);
  if (activatedCust.status !== 'active' || !activatedCust.kycVerified) {
    throw new Error('KYC verification failed to auto-activate customer!');
  }

  console.log(`   Customer Approval Event Fired: ${customerEventFired} (Expected: true)`);
  if (!customerEventFired) {
    throw new Error('customer.approved event did not fire!');
  }

  console.log('🌱 Step 5: Assigning Manager to Executive...');
  resetPromise();
  await assignManager({ params: { id: executive._id }, body: { managerId: manager._id } }, createMockRes(), mockNext);
  await responsePromise;

  const updatedExec = await User.findById(executive._id);
  console.log(`   Executive assigned managerId: "${updatedExec.managerId}" (Expected: "${manager._id}")`);
  if (updatedExec.managerId?.toString() !== manager._id.toString()) {
    throw new Error('Failed to assign manager to executive!');
  }

  console.log('🌱 Step 6: Testing executive KYC verification (should auto-activate executive & fire event)...');
  resetPromise();
  await verifyUserKyc({ params: { id: executive._id }, body: { kycVerified: true } }, createMockRes(), mockNext);
  await responsePromise;

  const activatedExec = await User.findById(executive._id);
  console.log(`   Activated Executive status: "${activatedExec.status}" (Expected: "active")`);
  if (activatedExec.status !== 'active') {
    throw new Error('KYC verification failed to auto-activate executive!');
  }

  console.log(`   Executive Approval Event Fired: ${executiveEventFired} (Expected: true)`);
  if (!executiveEventFired) {
    throw new Error('executive.approved event did not fire!');
  }

  console.log('🧹 Cleaning up database...');
  await User.deleteMany({ email: { $in: [customerEmail, execEmail, managerEmail] } });

  console.log('🎉 ALL ONBOARDING AND HIERARCHY TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
