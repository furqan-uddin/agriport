import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from '../src/modules/users/user.model.js';
import Category from '../src/modules/categories/category.model.js';
import Product from '../src/modules/products/product.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import env from '../src/config/env.js';

const testAdminEmail = 'test_invoice_admin@agriport.in';
const testCustomerEmail = 'test_invoice_cust@agriport.in';
const testPassword = 'SecurePassword123';
const testSku = 'INV-TEST-PROD-001';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up invoice test data...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up
  await User.deleteMany({ email: { $in: [testAdminEmail, testCustomerEmail] } });
  await Product.deleteOne({ sku: testSku });
  await Category.deleteOne({ name: 'Test Invoice Category' });
  
  console.log('✅ Cleaned up old test records.');

  // 1. Create Category
  const category = await Category.create({
    name: 'Test Invoice Category',
    image: 'http://example.com/inv_cat.jpg',
    order: 1,
  });
  console.log('✅ Category created:', category._id);

  // 2. Create Product
  const product = await Product.create({
    name: 'Test Organic Wheat Lot',
    description: 'Fresh quality wheat for invoicing checks.',
    sku: testSku,
    category: category._id,
    unit: 'kg',
    moq: 100,
    stock: 500,
    priceSlabs: [{ minQty: 100, unitPrice: 35.0 }],
  });
  console.log('✅ Product created:', product._id);

  // 3. Create Admin and Customer Users
  const adminUser = await User.create({
    name: 'Invoice Admin',
    email: testAdminEmail,
    mobile: '9898911111',
    password: testPassword,
    role: 'admin',
    status: 'active',
  });

  const customerUser = await User.create({
    name: 'Invoice Customer',
    email: testCustomerEmail,
    mobile: '9898922222',
    password: testPassword,
    role: 'customer',
    status: 'active',
    companyName: 'Agro Foods Ltd',
    gstNumber: '27ABCDE1234F1Z0',
    city: 'Mumbai',
    address: 'Andheri East, Road 4',
  });
  console.log('✅ Admin and Customer users created.');

  // 4. Create Order
  const order = await Order.create({
    customerId: customerUser._id,
    paymentMode: 'bank_transfer',
    status: 'confirmed', // immediately confirmed to mimic status updates
    paymentStatus: 'paid',
    lines: [
      {
        productId: product._id,
        name: product.name,
        quantity: 200,
        unit: 'kg',
        unitPrice: 35.0,
        lineTotal: 7000.0,
      },
    ],
    subtotal: 7000.0,
    tax: 350.0, // 5% GST
    shipping: 1500.0,
    total: 8850.0,
    deliveryAddress: 'Andheri East, Mumbai',
    customerName: customerUser.name,
    companyName: customerUser.companyName,
    customerPhone: customerUser.mobile,
    customerCity: customerUser.city,
  });
  console.log('✅ Test Order created with Ref:', order.reference);

  // 5. Create Transaction
  const transaction = await Transaction.create({
    orderId: order._id,
    orderRef: order.reference,
    customerId: customerUser._id,
    amount: order.total,
    mode: order.paymentMode,
    status: 'paid',
  });
  console.log('✅ Associated Transaction created.');

  // Disconnect before fetching API
  await mongoose.disconnect();

  // 6. Log in as admin to get JWT Access Token
  console.log('\n🔐 Authenticating Admin User...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginData.message}`);
  }
  const adminToken = loginData.data.accessToken;
  console.log('🔑 Admin Token received successfully.');

  // 7. Request Invoice PDF via Standard JWT Auth route
  console.log('\n📥 Fetching invoice via standard JWT auth route...');
  const downloadRes = await fetch(`http://localhost:5000/api/v1/orders/${order._id}/invoice`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });

  console.log(`- Response Status: ${downloadRes.status}`);
  console.log(`- Content-Type: ${downloadRes.headers.get('content-type')}`);
  console.log(`- Content-Disposition: ${downloadRes.headers.get('content-disposition')}`);

  if (downloadRes.status !== 200) {
    const errText = await downloadRes.text();
    throw new Error(`Failed download request: ${errText}`);
  }
  
  if (downloadRes.headers.get('content-type') !== 'application/pdf') {
    throw new Error(`Expected content-type application/pdf, got ${downloadRes.headers.get('content-type')}`);
  }

  // 8. Request Invoice PDF via Share Token route (Unauthenticated)
  console.log('\n📥 Fetching invoice via secure public share token (unauthenticated)...');
  
  // Reconnect DB to grab order shareToken
  await mongoose.connect(env.MONGO_URI);
  const updatedOrder = await Order.findById(order._id);
  await mongoose.disconnect();

  console.log(`🔑 Retrieved Order shareToken: ${updatedOrder.shareToken}`);

  const shareRes = await fetch(`http://localhost:5000/api/v1/orders/${order._id}/invoice?shareToken=${updatedOrder.shareToken}`);
  console.log(`- Response Status: ${shareRes.status}`);
  console.log(`- Content-Type: ${shareRes.headers.get('content-type')}`);
  
  if (shareRes.status !== 200) {
    const errText = await shareRes.text();
    throw new Error(`Failed shareToken request: ${errText}`);
  }

  // 9. Verify security protection (access with invalid token must fail)
  console.log('\n🚫 Testing unauthorized download request...');
  const badRes = await fetch(`http://localhost:5000/api/v1/orders/${order._id}/invoice?shareToken=wrong_token`);
  console.log(`- Response Status: ${badRes.status}`);
  if (badRes.status !== 403) {
    throw new Error(`Expected status 403 for invalid share token, got ${badRes.status}`);
  }
  const badBody = await badRes.json();
  console.log('✅ Unauthorized access rejected with:', badBody.message);

  // 10. Verify PDF file is created permanently on disk
  const secureDir = path.join(process.cwd(), 'uploads', 'secure_invoices');
  const filePath = path.join(secureDir, `${order.reference}.pdf`);
  console.log(`\n📁 Checking disk storage path: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    throw new Error('Invoice PDF file was not stored permanently on disk!');
  }
  console.log('✅ Invoice PDF file is verified permanently on disk.');

  // Clean up DB
  console.log('\n🧹 Cleaning up test database records and files...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteMany({ email: { $in: [testAdminEmail, testCustomerEmail] } });
  await Product.deleteOne({ _id: product._id });
  await Category.deleteOne({ _id: category._id });
  await Order.deleteOne({ _id: order._id });
  await Transaction.deleteOne({ _id: transaction._id });
  await mongoose.disconnect();

  // Delete generated test PDF file
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('🗑️ Deleted test PDF from disk.');
  }

  console.log('\n🎉 ALL INVOICE GENERATION AND DOWNLOAD SECURITY TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Try cleanup just in case
  try {
    await mongoose.connect(env.MONGO_URI);
    await User.deleteMany({ email: { $in: [testAdminEmail, testCustomerEmail] } });
    await Product.deleteOne({ sku: testSku });
    await Category.deleteOne({ name: 'Test Invoice Category' });
    await mongoose.disconnect();
  } catch (cleanErr) {
    console.error('Could not clean up DB records:', cleanErr);
  }
  process.exit(1);
});
