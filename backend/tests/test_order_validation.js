import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Category from '../src/modules/categories/category.model.js';
import Order from '../src/modules/orders/order.model.js';
import env from '../src/config/env.js';

const testCustomerEmail = 'test_order_val_cust@agriport.in';
const testPassword = 'SecurePassword123';
const testSku = 'VAL-TEST-PROD';

const testAdminEmail = 'test_order_val_admin@agriport.in';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up order validation test...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up
  await User.deleteMany({ email: { $in: [testCustomerEmail, testAdminEmail] } });
  await Product.deleteOne({ sku: testSku });
  await Category.deleteOne({ name: 'Validation Test Category' });
  
  // Setup temporary category, product, customer, and admin
  const category = await Category.create({
    name: 'Validation Test Category',
    image: 'http://example.com/val_cat.jpg',
    order: 1,
  });

  const product = await Product.create({
    name: 'Validation Test Wheat',
    description: 'Wheat for validation test checks.',
    sku: testSku,
    category: category._id,
    unit: 'kg',
    moq: 10,
    stock: 200,
    priceSlabs: [{ minQty: 10, unitPrice: 30.0 }],
  });

  const customerUser = await User.create({
    name: 'Validation Customer',
    email: testCustomerEmail,
    mobile: '9898955555',
    password: testPassword,
    role: 'customer',
    status: 'active',
    companyName: 'Val Agro Co',
    gstNumber: '27ABCDE1234F1Z0',
    city: 'Pune',
    address: 'Deccan Gymkhana, Pune 411004',
    businessType: 'Wholesaler',
  });

  const adminUser = await User.create({
    name: 'Validation Admin',
    email: testAdminEmail,
    mobile: '9898966666',
    password: testPassword,
    role: 'admin',
    status: 'active',
  });

  console.log('✅ Temporary users (customer & admin), product, and category created.');

  // Disconnect before doing HTTP requests
  await mongoose.disconnect();

  // Log in as customer to get token
  console.log('\n🔐 Authenticating Customer User...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testCustomerEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Customer login failed: ${loginData.message}`);
  }
  const token = loginData.data.accessToken;
  console.log('🔑 Received Customer Token.');

  // Log in as admin to get token
  console.log('\n🔐 Authenticating Admin User...');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminEmail, password: testPassword }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) {
    throw new Error(`Admin login failed: ${adminLoginData.message}`);
  }
  const adminToken = adminLoginData.data.accessToken;
  console.log('🔑 Received Admin Token.');

  // Helper to send checkout request
  const testCheckout = async (payload, expectedStatus, testName) => {
    console.log(`\n📋 Running test: "${testName}"`);
    const res = await fetch('http://localhost:5000/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`- Expected Status: ${expectedStatus}, Got: ${res.status}`);
    const body = await res.json();
    
    if (res.status !== expectedStatus) {
      throw new Error(`Test "${testName}" failed. Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(body)}`);
    }
    
    if (res.status === 400) {
      console.log(`✅ Correctly rejected: ${body.message}`);
    } else if (res.status === 201) {
      console.log(`✅ Order placed successfully! Reference: ${body.data.reference}`);
      // Clean up the created order in DB
      await mongoose.connect(env.MONGO_URI);
      await Order.deleteOne({ _id: body.data._id });
      await mongoose.disconnect();
    }
  };

  // Test 1: Empty lines array
  await testCheckout({
    lines: [],
    paymentMode: 'bank_transfer',
    deliveryAddress: 'Test Location Road, City Name 400001',
  }, 400, 'Empty lines list rejection');

  // Test 2: Negative quantity
  await testCheckout({
    lines: [{ productId: product._id.toString(), quantity: -5 }],
    paymentMode: 'bank_transfer',
    deliveryAddress: 'Test Location Road, City Name 400001',
  }, 400, 'Negative quantity rejection');

  // Test 3: Invalid payment mode
  await testCheckout({
    lines: [{ productId: product._id.toString(), quantity: 15 }],
    paymentMode: 'invalid_mode',
    deliveryAddress: 'Test Location Road, City Name 400001',
  }, 400, 'Invalid paymentMode rejection');

  // Test 4: Delivery address too short
  await testCheckout({
    lines: [{ productId: product._id.toString(), quantity: 15 }],
    paymentMode: 'cash',
    deliveryAddress: 'No',
  }, 400, 'Short delivery address rejection');

  // Test 5: Valid order checkout
  await testCheckout({
    lines: [{ productId: product._id.toString(), quantity: 15 }],
    paymentMode: 'offline',
    deliveryAddress: 'Deccan Gymkhana, Pune 411004',
  }, 201, 'Valid checkout validation success');

  // Test 6: Malformed URL Parameter ID on GET /orders/:id
  console.log('\n📋 Running test: "Malformed ObjectId param rejection"');
  const resParam = await fetch('http://localhost:5000/api/v1/orders/123', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  console.log(`- Expected Status: 400, Got: ${resParam.status}`);
  const bodyParam = await resParam.json();
  if (resParam.status !== 400) {
    throw new Error(`Malformed ID parameter test failed. Expected 400, got ${resParam.status}. Body: ${JSON.stringify(bodyParam)}`);
  }
  console.log(`✅ Correctly rejected: ${bodyParam.message}`);

  // Test 7: Invalid status update value on PATCH /orders/admin/:id/status
  console.log('\n📋 Running test: "Invalid status update rejection"');
  const validDummyId = new mongoose.Types.ObjectId().toString();
  const resStatusVal = await fetch(`http://localhost:5000/api/v1/orders/admin/${validDummyId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'invalid_status', reason: 'Testing' }),
  });
  console.log(`- Expected Status: 400, Got: ${resStatusVal.status}`);
  const bodyStatusVal = await resStatusVal.json();
  if (resStatusVal.status !== 400) {
    throw new Error(`Invalid status update test failed. Expected 400, got ${resStatusVal.status}. Body: ${JSON.stringify(bodyStatusVal)}`);
  }
  console.log(`✅ Correctly rejected: ${bodyStatusVal.message}`);

  // Test 8: Malformed status update URL param on PATCH /orders/admin/:id/status
  console.log('\n📋 Running test: "Malformed status update URL param rejection"');
  const resStatusParam = await fetch('http://localhost:5000/api/v1/orders/admin/123/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'confirmed' }),
  });
  console.log(`- Expected Status: 400, Got: ${resStatusParam.status}`);
  const bodyStatusParam = await resStatusParam.json();
  if (resStatusParam.status !== 400) {
    throw new Error(`Malformed status update param test failed. Expected 400, got ${resStatusParam.status}. Body: ${JSON.stringify(bodyStatusParam)}`);
  }
  console.log(`✅ Correctly rejected: ${bodyStatusParam.message}`);

  // Cleanup Database
  console.log('\n🧹 Cleaning up test database records...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteMany({ _id: { $in: [customerUser._id, adminUser._id] } });
  await Product.deleteOne({ _id: product._id });
  await Category.deleteOne({ _id: category._id });
  await mongoose.disconnect();

  console.log('\n🎉 ALL ORDER VALIDATION TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch (cleanErr) {
      console.error('Could not disconnect:', cleanErr);
    }
  }
  try {
    await mongoose.connect(env.MONGO_URI);
    await User.deleteMany({ email: { $in: [testCustomerEmail, testAdminEmail] } });
    await Product.deleteOne({ sku: testSku });
    await Category.deleteOne({ name: 'Validation Test Category' });
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.error('Could not clean up DB records:', cleanErr);
  }
  process.exit(1);
});
