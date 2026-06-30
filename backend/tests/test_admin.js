import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Category from '../src/modules/categories/category.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import StockRequest from '../src/modules/inventory/stockRequest.model.js';
import env from '../src/config/env.js';

const ADMIN_EMAIL = 'test_admin@agriport.in';
const CUSTOMER_EMAIL = 'test_customer_admin@agriport.in';
const PASSWORD = 'Password123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean up and seed...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, CUSTOMER_EMAIL, 'new_manager@agriport.in', 'test_exec_approval@agriport.in'] } });
  await User.deleteMany({ mobile: { $in: ['1111111111', '2222222222', '3333333333', '4444444444'] } });
  
  const oldCategory = await Category.findOne({ name: 'Test Admin Category' });
  if (oldCategory) {
    await Product.deleteMany({ category: oldCategory._id });
    await Category.deleteOne({ _id: oldCategory._id });
  }
  await Product.deleteMany({ sku: 'TESTADMINPROD123' });

  console.log('✅ Cleaned up old test records.');

  // 2. Seed Admin, Customer, Category and Product
  const testCategory = await Category.create({
    name: 'Test Admin Category',
    slug: 'test-admin-category',
  });

  const testProduct = await Product.create({
    name: 'Test Admin Product',
    description: 'Test Description',
    sku: 'TESTADMINPROD123',
    category: testCategory._id,
    unit: 'kg',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 100 }],
    stock: 50,
  });

  const admin = await User.create({
    name: 'Test Admin User',
    email: ADMIN_EMAIL,
    mobile: '1111111111',
    password: PASSWORD,
    role: 'admin',
    status: 'active',
  });

  const customer = await User.create({
    name: 'Test Customer User',
    email: CUSTOMER_EMAIL,
    mobile: '2222222222',
    password: PASSWORD,
    role: 'customer',
    status: 'active',
    companyName: 'Test Customer Co',
    city: 'Mumbai',
    businessType: 'Wholesaler',
  });

  console.log('✅ Seeded admin, customer, product, and category successfully.');

  // 3. Log in Customer to retrieve token
  console.log('\n🔑 Logging in Customer...');
  const customerLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: CUSTOMER_EMAIL, password: PASSWORD }),
  });
  const customerLoginData = await customerLoginRes.json();
  if (!customerLoginRes.ok) throw new Error('Customer login failed');
  const customerToken = customerLoginData.data.accessToken;
  console.log('✅ Customer logged in successfully.');

  // 4. Log in Admin to retrieve token
  console.log('\n🔑 Logging in Admin...');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: ADMIN_EMAIL, password: PASSWORD }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error('Admin login failed');
  const adminToken = adminLoginData.data.accessToken;
  console.log('✅ Admin logged in successfully.');

  // 5. Customer places an order
  console.log('\n🛍️ Customer placing order...');
  const orderRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      lines: [
        {
          productId: testProduct._id.toString(),
          quantity: 10,
        },
      ],
      paymentMode: 'offline',
      deliveryAddress: '123 Test Street, Mumbai',
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error(`Order placement failed: ${JSON.stringify(orderData)}`);
  const orderId = orderData.data._id;
  const orderRef = orderData.data.reference;
  console.log(`✅ Order placed successfully. ID: ${orderId}, Ref: ${orderRef}`);

  // Verify stock is decremented
  const productAfterOrder = await Product.findById(testProduct._id);
  console.log(`Product stock after order (expected 40): ${productAfterOrder.stock}`);
  if (productAfterOrder.stock !== 40) throw new Error('Stock decrement failed');

  // Find the generated pending transaction
  const transaction = await Transaction.findOne({ orderId });
  if (!transaction) throw new Error('Transaction record not generated for order');
  console.log(`✅ Pending transaction found. ID: ${transaction._id}`);

  // 6. Admin lists orders
  console.log('\n📋 Admin listing orders...');
  const listOrdersRes = await fetch('http://localhost:5000/api/v1/orders/admin/list?search=' + orderRef, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const listOrdersData = await listOrdersRes.json();
  if (!listOrdersRes.ok) throw new Error('Admin order listing failed');
  if (listOrdersData.data.orders.length === 0) throw new Error('Order search failed');
  console.log('✅ Admin order list verification successful.');

  // 7. Admin verifies offline payment
  console.log('\n💵 Admin verifying offline payment...');
  const verifyPaymentRes = await fetch(`http://localhost:5000/api/v1/payments/admin/${transaction._id}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const verifyPaymentData = await verifyPaymentRes.json();
  if (!verifyPaymentRes.ok) throw new Error(`Payment verification failed: ${JSON.stringify(verifyPaymentData)}`);
  console.log('✅ Offline payment verified.');

  // Verify order payment status is 'paid' and status is 'confirmed'
  const updatedOrder = await Order.findById(orderId);
  console.log(`Order paymentStatus (expected paid): ${updatedOrder.paymentStatus}`);
  console.log(`Order status (expected confirmed): ${updatedOrder.status}`);
  if (updatedOrder.paymentStatus !== 'paid' || updatedOrder.status !== 'confirmed') {
    throw new Error('Order payment update/confirmation failed');
  }

  // 8. Admin cancels the order (should restore stock)
  console.log('\n❌ Admin cancelling order to verify stock restoration...');
  const cancelRes = await fetch(`http://localhost:5000/api/v1/orders/admin/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'cancelled', reason: 'Customer requested cancellation' }),
  });
  const cancelData = await cancelRes.json();
  if (!cancelRes.ok) throw new Error('Order cancellation failed');

  // Verify stock is restored back to 50
  const productAfterCancel = await Product.findById(testProduct._id);
  console.log(`Product stock after cancellation (expected 50): ${productAfterCancel.stock}`);
  if (productAfterCancel.stock !== 50) throw new Error('Stock restoration failed');
  console.log('✅ Stock successfully restored on cancellation.');

  // 9. Admin User Status management
  console.log('\n👤 Admin managing user status...');
  const blockUserRes = await fetch(`http://localhost:5000/api/v1/users/admin/${customer._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'blocked' }),
  });
  const blockUserData = await blockUserRes.json();
  if (!blockUserRes.ok) throw new Error('Blocking user failed');
  
  const blockedUser = await User.findById(customer._id);
  console.log(`User status (expected blocked): ${blockedUser.status}`);
  if (blockedUser.status !== 'blocked') throw new Error('Status block failed');

  // Unblock back to active
  await fetch(`http://localhost:5000/api/v1/users/admin/${customer._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'active' }),
  });
  console.log('✅ User blocked and restored back to active.');

  // 10. Admin creates a new Sales Manager
  console.log('\n💼 Admin creating a Sales Manager...');
  const managerRes = await fetch('http://localhost:5000/api/v1/users/admin/sales/managers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'New Manager',
      email: 'new_manager@agriport.in',
      mobile: '3333333333',
      password: PASSWORD,
      region: 'West',
      target: 500000,
    }),
  });
  const managerData = await managerRes.json();
  if (!managerRes.ok) throw new Error(`Manager creation failed: ${JSON.stringify(managerData)}`);
  console.log('✅ Sales Manager created successfully.');

  // 11. Admin approves an Executive onboarding
  console.log('\n💼 Admin approving Executive onboarding...');
  const testExec = await User.create({
    name: 'Pending Exec',
    email: 'test_exec_approval@agriport.in',
    mobile: '4444444444',
    password: PASSWORD,
    role: 'executive',
    status: 'pending',
    region: 'North',
    aadhaarUrl: '/uploads/mock_aadhaar.pdf',
    panUrl: '/uploads/mock_pan.png',
  });

  const approveExecRes = await fetch(`http://localhost:5000/api/v1/users/admin/sales/executive-approvals/${testExec._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'active' }),
  });
  const approveExecData = await approveExecRes.json();
  if (!approveExecRes.ok) throw new Error(`Executive approval failed: ${JSON.stringify(approveExecData)}`);
  
  const updatedExec = await User.findById(testExec._id);
  console.log(`Approved Exec status (expected active): ${updatedExec.status}`);
  if (updatedExec.status !== 'active') throw new Error('Executive activation failed');
  console.log('✅ Executive successfully approved.');

  // 12. Admin Inventory Stock Request audit
  console.log('\n📦 Admin managing stock requests...');
  const stockReq = await StockRequest.create({
    productId: testProduct._id,
    productName: testProduct.name,
    category: testCategory.name,
    requesterId: admin._id,
    requesterRole: 'manager',
    type: 'add',
    currentStock: testProduct.stock,
    requestedChange: 15,
    status: 'pending',
  });

  const approveStockRes = await fetch(`http://localhost:5000/api/v1/inventory/stock-requests/${stockReq._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'approved' }),
  });
  const approveStockData = await approveStockRes.json();
  if (!approveStockRes.ok) throw new Error(`Stock request approval failed: ${JSON.stringify(approveStockData)}`);

  const updatedProduct = await Product.findById(testProduct._id);
  console.log(`Product stock after stock request approved (expected 65): ${updatedProduct.stock}`);
  if (updatedProduct.stock !== 65) throw new Error('Stock request stock addition failed');
  console.log('✅ Stock request approved and product stock successfully incremented.');

  // 13. Reports Aggregations
  console.log('\n📊 Checking Reports and Aggregations...');
  // A. Dashboard stats
  const statsRes = await fetch('http://localhost:5000/api/v1/reports/dashboard-stats', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const statsData = await statsRes.json();
  if (!statsRes.ok) throw new Error('Dashboard stats request failed');
  console.log('Dashboard totalRevenue:', statsData.data.totalRevenue);
  console.log('Dashboard activeManagers:', statsData.data.activeManagers);
  console.log('Dashboard activeExecutives:', statsData.data.activeExecutives);

  // B. Sales series
  const seriesRes = await fetch('http://localhost:5000/api/v1/reports/sales-series', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const seriesData = await seriesRes.json();
  if (!seriesRes.ok) throw new Error('Sales series request failed');
  console.log('Sales series length:', seriesData.data.length);

  // C. Category sales
  const catSalesRes = await fetch('http://localhost:5000/api/v1/reports/category-sales', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const catSalesData = await catSalesRes.json();
  if (!catSalesRes.ok) throw new Error('Category sales request failed');
  console.log('Category sales records:', catSalesData.data);

  console.log('\n🧹 Cleaning up database test records...');
  // Clean up order and transactions
  await Order.deleteOne({ _id: orderId });
  await Transaction.deleteOne({ orderId });
  await StockRequest.deleteOne({ _id: stockReq._id });
  await User.deleteMany({ email: { $in: [ADMIN_EMAIL, CUSTOMER_EMAIL, 'new_manager@agriport.in', 'test_exec_approval@agriport.in'] } });
  await Product.deleteMany({ _id: testProduct._id });
  await Category.deleteOne({ _id: testCategory._id });
  await User.deleteOne({ _id: testExec._id });

  console.log('\n🎉 ALL ADMIN CONTROL PANEL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
