import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Category from '../src/modules/categories/category.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import env from '../src/config/env.js';

const testPassword = 'AuthSecurePassword123';
const testSku = 'AUTH-TEST-PROD';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up authorization tests...');
  await mongoose.connect(env.MONGO_URI);

  // Define emails
  const emails = {
    pendingExec: 'test_auth_pending_exec@agriport.in',
    activeExec: 'test_auth_active_exec@agriport.in',
    activeExecOther: 'test_auth_active_exec_other@agriport.in',
    activeCust: 'test_auth_active_cust@agriport.in',
    activeCustOther: 'test_auth_active_cust_other@agriport.in',
    manager: 'test_auth_manager@agriport.in',
  };

  // Clean up existing records
  await User.deleteMany({ email: { $in: Object.values(emails) } });
  await Product.deleteOne({ sku: testSku });
  await Category.deleteOne({ name: 'Auth Test Category' });

  // Setup temporary category and product
  const category = await Category.create({
    name: 'Auth Test Category',
    image: 'http://example.com/auth_cat.jpg',
    order: 2,
  });

  const product = await Product.create({
    name: 'Auth Test Wheat',
    description: 'Wheat for authorization tests.',
    sku: testSku,
    category: category._id,
    unit: 'kg',
    moq: 10,
    stock: 500,
    priceSlabs: [{ minQty: 10, unitPrice: 20.0 }],
  });

  // Create Users
  const pendingExec = await User.create({
    name: 'Pending Exec',
    email: emails.pendingExec,
    mobile: '9700000001',
    password: testPassword,
    role: 'executive',
    status: 'pending',
  });

  const activeExec = await User.create({
    name: 'Active Exec 1',
    email: emails.activeExec,
    mobile: '9700000002',
    password: testPassword,
    role: 'executive',
    status: 'active',
  });

  const activeExecOther = await User.create({
    name: 'Active Exec 2',
    email: emails.activeExecOther,
    mobile: '9700000003',
    password: testPassword,
    role: 'executive',
    status: 'active',
  });

  const activeCust = await User.create({
    name: 'Active Cust 1',
    email: emails.activeCust,
    mobile: '9700000004',
    password: testPassword,
    role: 'customer',
    status: 'active',
    address: 'Deccan Road, Pune',
  });

  const activeCustOther = await User.create({
    name: 'Active Cust 2',
    email: emails.activeCustOther,
    mobile: '9700000005',
    password: testPassword,
    role: 'customer',
    status: 'active',
    address: 'Viman Road, Pune',
  });

  const manager = await User.create({
    name: 'Manager',
    email: emails.manager,
    mobile: '9700000006',
    password: testPassword,
    role: 'manager',
    status: 'active',
  });

  // Create CRM Customer linkings
  // Customer 1 is in Executive 1's portfolio
  const crmCust1 = await CRMCustomer.create({
    ownerId: activeExec._id,
    name: activeCust.name,
    platformUserId: activeCust._id,
    phone: activeCust.mobile,
    stage: 'active',
  });

  // Customer 2 is in Executive 2's portfolio
  const crmCust2 = await CRMCustomer.create({
    ownerId: activeExecOther._id,
    name: activeCustOther.name,
    platformUserId: activeCustOther._id,
    phone: activeCustOther.mobile,
    stage: 'active',
  });

  // Create Order 1 (Placed by Executive 1 on behalf of Customer 1)
  const order1 = await Order.create({
    customerId: activeCust._id,
    executiveId: activeExec._id,
    paymentMode: 'offline',
    lines: [{
      productId: product._id,
      name: product.name,
      quantity: 15,
      unitPrice: 20,
      lineTotal: 300,
    }],
    subtotal: 300,
    tax: 15,
    shipping: 1500,
    total: 1815,
    deliveryAddress: 'Deccan Road, Pune',
    customerName: activeCust.name,
    customerPhone: activeCust.mobile,
  });

  // Create Order 2 (Placed by Executive 2 on behalf of Customer 2)
  const order2 = await Order.create({
    customerId: activeCustOther._id,
    executiveId: activeExecOther._id,
    paymentMode: 'offline',
    lines: [{
      productId: product._id,
      name: product.name,
      quantity: 20,
      unitPrice: 20,
      lineTotal: 400,
    }],
    subtotal: 400,
    tax: 20,
    shipping: 1500,
    total: 1920,
    deliveryAddress: 'Viman Road, Pune',
    customerName: activeCustOther.name,
    customerPhone: activeCustOther.mobile,
  });

  console.log('✅ Temporary mock data created.');
  await mongoose.disconnect();

  // Helper to login
  const getAccessToken = async (email) => {
    const res = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: email, password: testPassword }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(`Login failed for ${email}: ${body.message}`);
    }
    return body.data.accessToken;
  };

  // Authenticate all users
  console.log('\n🔐 Authenticating test users...');
  const tokens = {
    pendingExec: await getAccessToken(emails.pendingExec),
    activeExec: await getAccessToken(emails.activeExec),
    activeExecOther: await getAccessToken(emails.activeExecOther),
    activeCust: await getAccessToken(emails.activeCust),
    activeCustOther: await getAccessToken(emails.activeCustOther),
    manager: await getAccessToken(emails.manager),
  };
  console.log('🔑 Tokens retrieved successfully.');

  // Helper to run authorization check
  const checkAccess = async (token, url, method, bodyPayload, expectedStatus, testName) => {
    console.log(`\n📋 Running test: "${testName}"`);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    if (bodyPayload) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(bodyPayload);
    }
    const res = await fetch(`http://localhost:5000${url}`, { ...options });
    console.log(`- Expected Status: ${expectedStatus}, Got: ${res.status}`);
    const body = await res.json().catch(() => ({}));
    if (res.status !== expectedStatus) {
      throw new Error(`Test "${testName}" failed. Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(body)}`);
    }
    console.log(`✅ Success: ${res.status === 403 ? 'Blocked' : 'Allowed'}`);
  };

  // Helper for direct raw fetch (like for stream invoice)
  const checkInvoiceAccess = async (token, orderId, expectedStatus, testName) => {
    console.log(`\n📋 Running test: "${testName}"`);
    const res = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log(`- Expected Status: ${expectedStatus}, Got: ${res.status}`);
    if (res.status !== expectedStatus) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Test "${testName}" failed. Expected status ${expectedStatus}, got ${res.status}. Body: ${JSON.stringify(body)}`);
    }
    console.log(`✅ Success: ${res.status === 403 ? 'Blocked' : 'Allowed'}`);
  };

  // ==========================================
  // SCENARIO 1: Pending User Access Boundary
  // ==========================================
  // Pending user should be allowed to view self profile
  await checkAccess(tokens.pendingExec, '/api/v1/users/me', 'GET', null, 200, 'Pending user self-profile read (Whitelisted)');
  // Pending user should be BLOCKED from creating orders
  await checkAccess(tokens.pendingExec, '/api/v1/orders', 'POST', {
    lines: [{ productId: product._id.toString(), quantity: 15 }],
    paymentMode: 'offline',
    deliveryAddress: 'Deccan Gymkhana, Pune',
  }, 403, 'Pending user order creation block');
  // Pending user should be BLOCKED from fetching orders
  await checkAccess(tokens.pendingExec, '/api/v1/orders', 'GET', null, 403, 'Pending user order list query block');

  // ==========================================
  // SCENARIO 2: Customer Access Boundaries
  // ==========================================
  // Customer 1 can access Order 1 (own order)
  await checkAccess(tokens.activeCust, `/api/v1/orders/${order1._id}`, 'GET', null, 200, 'Customer detail query (own order)');
  // Customer 1 cannot access Order 2 (other customer's order)
  await checkAccess(tokens.activeCust, `/api/v1/orders/${order2._id}`, 'GET', null, 403, 'Customer detail query (other order block)');

  // ==========================================
  // SCENARIO 3: Executive CRM Portfolio Creation Boundary
  // ==========================================
  // Executive 1 cannot place an order for Customer 2 (not in portfolio)
  await checkAccess(tokens.activeExec, '/api/v1/orders', 'POST', {
    customerId: activeCustOther._id.toString(),
    lines: [{ productId: product._id.toString(), quantity: 15 }],
    paymentMode: 'offline',
    deliveryAddress: 'Viman Road, Pune',
  }, 403, 'Executive portfolio order creation block (hijack protection)');

  // Executive 1 CAN place order for Customer 1 (in portfolio)
  await checkAccess(tokens.activeExec, '/api/v1/orders', 'POST', {
    customerId: activeCust._id.toString(),
    lines: [{ productId: product._id.toString(), quantity: 10 }],
    paymentMode: 'offline',
    deliveryAddress: 'Deccan Road, Pune',
  }, 201, 'Executive portfolio order creation success');

  // ==========================================
  // SCENARIO 4: Executive Order detail and List Access Boundaries
  // ==========================================
  // Executive 1 can access Order 1 (they placed it / customer in portfolio)
  await checkAccess(tokens.activeExec, `/api/v1/orders/${order1._id}`, 'GET', null, 200, 'Executive order detail query (own customer)');
  // Executive 1 cannot access Order 2 (placed by other executive for other customer)
  await checkAccess(tokens.activeExec, `/api/v1/orders/${order2._id}`, 'GET', null, 403, 'Executive order detail query (other customer block)');

  // ==========================================
  // SCENARIO 5: Horizontal Privilege Escalation in Invoice Downloads
  // ==========================================
  // Executive 1 can download invoice for Order 1
  await checkInvoiceAccess(tokens.activeExec, order1._id.toString(), 200, 'Executive invoice download (own customer)');
  // Executive 1 cannot download invoice for Order 2 (hijack block)
  await checkInvoiceAccess(tokens.activeExec, order2._id.toString(), 403, 'Executive invoice download (other customer block)');

  // ==========================================
  // SCENARIO 6: Manager Escalation access
  // ==========================================
  // Manager can view Order 1
  await checkAccess(tokens.manager, `/api/v1/orders/${order1._id}`, 'GET', null, 200, 'Manager detail query (Order 1)');
  // Manager can view Order 2
  await checkAccess(tokens.manager, `/api/v1/orders/${order2._id}`, 'GET', null, 200, 'Manager detail query (Order 2)');
  // Manager can list orders and see all
  await checkAccess(tokens.manager, '/api/v1/orders', 'GET', null, 200, 'Manager list orders');

  // Database Cleanup
  console.log('\n🧹 Cleaning up test database records...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteMany({ _id: { $in: [
    pendingExec._id, activeExec._id, activeExecOther._id,
    activeCust._id, activeCustOther._id, manager._id
  ] } });
  await Product.deleteOne({ _id: product._id });
  await Category.deleteOne({ _id: category._id });
  await CRMCustomer.deleteMany({ _id: { $in: [crmCust1._id, crmCust2._id] } });
  await Order.deleteMany({ _id: { $in: [order1._id, order2._id] } });
  await Transaction.deleteMany({ orderId: { $in: [order1._id, order2._id] } });
  await mongoose.disconnect();

  console.log('\n🎉 ALL ORDER AUTHORIZATION REGRESSION TESTS PASSED SUCCESSFULLY!');
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
    await User.deleteMany({ email: { $in: [
      'test_auth_pending_exec@agriport.in',
      'test_auth_active_exec@agriport.in',
      'test_auth_active_exec_other@agriport.in',
      'test_auth_active_cust@agriport.in',
      'test_auth_active_cust_other@agriport.in',
      'test_auth_manager@agriport.in',
    ] } });
    await Product.deleteOne({ sku: testSku });
    await Category.deleteOne({ name: 'Auth Test Category' });
    await CRMCustomer.deleteMany({ name: { $in: ['Active Cust 1', 'Active Cust 2'] } });
    // We clean up created test orders on error
    await Order.deleteMany({ customerName: { $in: ['Active Cust 1', 'Active Cust 2'] } });
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.error('Could not clean up DB records:', cleanErr);
  }
  process.exit(1);
});
