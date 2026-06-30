import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import VendorPurchase from '../src/modules/inventory/vendorPurchase.model.js';
import env from '../src/config/env.js';

const EXEC_EMAIL = 'exec_purch_test@agriport.in';
const PASSWORD = 'SecurePassword123';
const VENDOR_NAME = 'Test Purchase Vendor Co';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB for Vendor Purchases tests...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: EXEC_EMAIL });
  await Product.deleteMany({ name: 'Test Purchase Product' });
  await VendorPurchase.deleteMany({ vendorName: VENDOR_NAME });
  console.log('✅ Cleaned up old test records.');

  // 2. Create products
  const product = await Product.create({
    name: 'Test Purchase Product',
    sku: 'SKU-PURCH-999',
    category: new mongoose.Types.ObjectId(),
    description: 'High quality product for purchase logging test',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 150 }],
    stock: 100,
    unit: 'bags',
  });
  console.log(`✅ Seeded product with initial stock: ${product.stock} ${product.unit}`);

  // 3. Seed Executive user
  const executive = await User.create({
    name: 'Exec Purchase Test',
    email: EXEC_EMAIL,
    mobile: '7777700000',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'South',
    aadhaarUrl: '/uploads/dummy_aadhaar.png',
    panUrl: '/uploads/dummy_pan.png',
  });
  console.log('✅ Seeded Executive account.');

  // 4. Log in executive to get token
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

  // 5. Test POST /inventory/vendor-purchases with status 'pending' (should NOT change stock)
  console.log('\n🛒 Creating PENDING vendor purchase...');
  const purchasePendingRes = await fetch('http://localhost:5000/api/v1/inventory/vendor-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      vendorName: VENDOR_NAME,
      productId: product._id,
      quantity: 50,
      unit: 'bags',
      buyPrice: 120,
      purchaseDate: new Date().toISOString(),
      status: 'pending',
      notes: 'Testing pending status does not alter catalog stock.',
    }),
  });
  const pendingData = await purchasePendingRes.json();
  if (!purchasePendingRes.ok) throw new Error(`Pending purchase creation failed: ${JSON.stringify(pendingData)}`);
  
  // Verify stock is still 100
  const productAfterPending = await Product.findById(product._id);
  if (productAfterPending.stock !== 100) {
    throw new Error(`Stock level changed! Expected 100, got ${productAfterPending.stock}`);
  }
  console.log(`✅ Pending purchase logged. Catalog stock unchanged: ${productAfterPending.stock} ${productAfterPending.unit}`);

  // 6. Test POST /inventory/vendor-purchases with status 'received' (SHOULD increment stock)
  console.log('\n🛒 Creating RECEIVED vendor purchase...');
  const purchaseReceivedRes = await fetch('http://localhost:5000/api/v1/inventory/vendor-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      vendorName: VENDOR_NAME,
      productId: product._id,
      quantity: 35,
      unit: 'bags',
      buyPrice: 110,
      purchaseDate: new Date().toISOString(),
      status: 'received',
      notes: 'Testing received status increments catalog stock.',
    }),
  });
  const receivedData = await purchaseReceivedRes.json();
  if (!purchaseReceivedRes.ok) throw new Error(`Received purchase creation failed: ${JSON.stringify(receivedData)}`);
  
  // Verify stock incremented to 135 (100 + 35)
  const productAfterReceived = await Product.findById(product._id);
  if (productAfterReceived.stock !== 135) {
    throw new Error(`Stock level was not updated correctly! Expected 135, got ${productAfterReceived.stock}`);
  }
  console.log(`✅ Received purchase logged. Catalog stock atomically updated: ${productAfterReceived.stock} ${productAfterReceived.unit}`);

  // 7. Test GET /inventory/vendor-purchases (Listing all logged purchases)
  console.log('\n📋 Fetching vendor purchases list...');
  const listRes = await fetch('http://localhost:5000/api/v1/inventory/vendor-purchases', {
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const listData = await listRes.json();
  if (!listRes.ok) throw new Error(`Fetch purchases failed: ${JSON.stringify(listData)}`);

  const purchases = listData.data.purchases || [];
  const foundPending = purchases.find((p) => p._id === pendingData.data._id);
  const foundReceived = purchases.find((p) => p._id === receivedData.data._id);

  if (!foundPending || !foundReceived) {
    throw new Error('Created vendor purchases were not found in listing response.');
  }
  console.log('✅ Vendor purchases successfully listed.');

  // 8. Test Unauthorized Requests rejection
  console.log('\n🔒 Testing unauthorized access rejection...');
  const unauthRes = await fetch('http://localhost:5000/api/v1/inventory/vendor-purchases');
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status}`);
  }
  console.log('✅ Unauthorized access successfully blocked.');

  // 9. Clean up database records
  await User.deleteMany({ email: EXEC_EMAIL });
  await Product.deleteMany({ name: 'Test Purchase Product' });
  await VendorPurchase.deleteMany({ vendorName: VENDOR_NAME });
  console.log('🧹 Cleaned up database records.');

  console.log('\n🎉 ALL VENDOR PURCHASES SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
