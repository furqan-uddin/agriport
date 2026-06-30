import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import StockRequest from '../src/modules/inventory/stockRequest.model.js';
import env from '../src/config/env.js';

const EXEC_EMAIL = 'exec_arrival_test@agriport.in';
const ADMIN_EMAIL = 'admin_arrival_test@agriport.in';
const PASSWORD = 'SecurePassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB for Stock Arrivals (Stock Request) tests...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: { $in: [EXEC_EMAIL, ADMIN_EMAIL] } });
  await Product.deleteMany({ name: 'Test Arrival Product' });
  await StockRequest.deleteMany({});
  console.log('✅ Cleaned up old test records.');

  // 2. Create product
  const product = await Product.create({
    name: 'Test Arrival Product',
    sku: 'SKU-ARR-999',
    category: new mongoose.Types.ObjectId(),
    description: 'High quality product for arrival stock request test',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 150 }],
    stock: 100,
    unit: 'bags',
  });
  console.log(`✅ Seeded product with initial stock: ${product.stock} ${product.unit}`);

  // 3. Seed Executive user
  const executive = await User.create({
    name: 'Exec Arrival Test',
    email: EXEC_EMAIL,
    mobile: '8888800000',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'South',
    aadhaarUrl: '/uploads/dummy_aadhaar.png',
    panUrl: '/uploads/dummy_pan.png',
  });
  console.log('✅ Seeded Executive account.');

  // 4. Seed Admin user
  const admin = await User.create({
    name: 'Admin Arrival Test',
    email: ADMIN_EMAIL,
    mobile: '9999900000',
    password: PASSWORD,
    role: 'admin',
    status: 'active',
  });
  console.log('✅ Seeded Admin account.');

  // 5. Log in executive to get token
  console.log('\n🔑 Logging in Executive...');
  const execLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: EXEC_EMAIL, password: PASSWORD }),
  });
  const execLoginData = await execLoginRes.json();
  if (!execLoginRes.ok) throw new Error('Executive login failed');
  const execToken = execLoginData.data.accessToken;
  console.log('✅ Executive logged in.');

  // 6. Log in admin to get token
  console.log('\n🔑 Logging in Admin...');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: ADMIN_EMAIL, password: PASSWORD }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error('Admin login failed');
  const adminToken = adminLoginData.data.accessToken;
  console.log('✅ Admin logged in.');

  // 7. Test POST /inventory/stock-requests as Executive (status pending)
  console.log('\n📦 Raising stock request (type: add) as Executive...');
  const createReqRes = await fetch('http://localhost:5000/api/v1/inventory/stock-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      productId: product._id,
      type: 'add',
      requestedChange: 50,
      notes: 'Testing stock request creation.',
    }),
  });
  const createReqData = await createReqRes.json();
  if (!createReqRes.ok) throw new Error(`Stock request creation failed: ${JSON.stringify(createReqData)}`);
  
  const requestId = createReqData.data._id;
  console.log(`✅ Stock request raised with ID: ${requestId}. Status: ${createReqData.data.status}`);

  // Verify stock is still 100 (pending requests shouldn't alter stock immediately)
  let productAfterRequest = await Product.findById(product._id);
  if (productAfterRequest.stock !== 100) {
    throw new Error(`Stock changed immediately on creation! Expected 100, got ${productAfterRequest.stock}`);
  }
  console.log(`✅ Product stock remains unchanged at ${productAfterRequest.stock}`);

  // 8. Test GET /inventory/stock-requests as Admin
  console.log('\n📋 Fetching stock requests as Admin...');
  const listRes = await fetch('http://localhost:5000/api/v1/inventory/stock-requests', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const listData = await listRes.json();
  if (!listRes.ok) throw new Error(`Fetch stock requests failed: ${JSON.stringify(listData)}`);

  const requests = listData.data.stockRequests || [];
  const foundRequest = requests.find((r) => r._id === requestId);
  if (!foundRequest) {
    throw new Error('Created stock request not found in admin list response.');
  }
  console.log('✅ Stock request successfully found in admin list.');

  // 9. Test PATCH /inventory/stock-requests/:id as Executive (should fail)
  console.log('\n🔒 Testing unauthorized status update by Executive (should be blocked)...');
  const updateByExecRes = await fetch(`http://localhost:5000/api/v1/inventory/stock-requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({ status: 'approved' }),
  });
  if (updateByExecRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${updateByExecRes.status}`);
  }
  console.log('✅ Status update blocked for non-admin user.');

  // 10. Test PATCH /inventory/stock-requests/:id as Admin (approve addition)
  console.log('\n✍️ Approving stock request (type: add) as Admin...');
  const approveRes = await fetch(`http://localhost:5000/api/v1/inventory/stock-requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'approved' }),
  });
  const approveData = await approveRes.json();
  if (!approveRes.ok) throw new Error(`Approve stock request failed: ${JSON.stringify(approveData)}`);

  // Verify stock incremented to 150 (100 + 50)
  let productAfterApprove = await Product.findById(product._id);
  if (productAfterApprove.stock !== 150) {
    throw new Error(`Stock not incremented correctly! Expected 150, got ${productAfterApprove.stock}`);
  }
  console.log(`✅ Stock request approved. Product stock incremented to: ${productAfterApprove.stock}`);

  // 11. Test POST /inventory/stock-requests as Executive (type: update)
  console.log('\n📦 Raising stock request (type: update) as Executive...');
  const createUpdateReqRes = await fetch('http://localhost:5000/api/v1/inventory/stock-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      productId: product._id,
      type: 'update',
      requestedChange: 75,
      notes: 'Testing overwrite stock request.',
    }),
  });
  const createUpdateReqData = await createUpdateReqRes.json();
  if (!createUpdateReqRes.ok) throw new Error(`Stock request creation failed: ${JSON.stringify(createUpdateReqData)}`);
  
  const updateRequestId = createUpdateReqData.data._id;
  console.log(`✅ Stock request raised with ID: ${updateRequestId}. Status: ${createUpdateReqData.data.status}`);

  // 12. Test PATCH /inventory/stock-requests/:id as Admin (approve update/overwrite)
  console.log('\n✍️ Approving stock request (type: update) as Admin...');
  const approveUpdateRes = await fetch(`http://localhost:5000/api/v1/inventory/stock-requests/${updateRequestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'approved' }),
  });
  const approveUpdateData = await approveUpdateRes.json();
  if (!approveUpdateRes.ok) throw new Error(`Approve update stock request failed: ${JSON.stringify(approveUpdateData)}`);

  // Verify stock is overwritten to 75
  let productAfterUpdateApprove = await Product.findById(product._id);
  if (productAfterUpdateApprove.stock !== 75) {
    throw new Error(`Stock not updated correctly! Expected 75, got ${productAfterUpdateApprove.stock}`);
  }
  console.log(`✅ Overwrite stock request approved. Product stock updated to: ${productAfterUpdateApprove.stock}`);

  // 13. Test PATCH /inventory/stock-requests/:id rejection as Admin
  console.log('\n📦 Raising stock request for rejection as Executive...');
  const createRejectReqRes = await fetch('http://localhost:5000/api/v1/inventory/stock-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      productId: product._id,
      type: 'add',
      requestedChange: 10,
      notes: 'This will be rejected.',
    }),
  });
  const rejectReqId = (await createRejectReqRes.json()).data._id;

  console.log('✍️ Rejecting stock request as Admin...');
  const rejectRes = await fetch(`http://localhost:5000/api/v1/inventory/stock-requests/${rejectReqId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'rejected', rejectionReason: 'Invalid details' }),
  });
  const rejectData = await rejectRes.json();
  if (!rejectRes.ok) throw new Error(`Reject stock request failed: ${JSON.stringify(rejectData)}`);
  
  // Verify stock remains 75
  let productAfterReject = await Product.findById(product._id);
  if (productAfterReject.stock !== 75) {
    throw new Error(`Stock changed on rejection! Expected 75, got ${productAfterReject.stock}`);
  }
  console.log(`✅ Stock request rejected. Product stock remained at: ${productAfterReject.stock}`);

  // 14. Clean up database records
  await User.deleteMany({ email: { $in: [EXEC_EMAIL, ADMIN_EMAIL] } });
  await Product.deleteMany({ name: 'Test Arrival Product' });
  await StockRequest.deleteMany({});
  console.log('🧹 Cleaned up database records.');

  console.log('\n🎉 ALL STOCK REQUESTS / ARRIVALS SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
