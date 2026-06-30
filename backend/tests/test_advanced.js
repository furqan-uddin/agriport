import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Product from '../src/modules/products/product.model.js';
import Category from '../src/modules/categories/category.model.js';
import User from '../src/modules/users/user.model.js';
import BusinessDocument from '../src/modules/users/businessDocument.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import SaleRecord from '../src/modules/sales/saleRecord.model.js';
import IncentiveRecord from '../src/modules/sales/incentiveRecord.model.js';
import eventBus from '../src/events/index.js';
import { calculateMonthlyIncentives, auditProductStockLevels } from '../src/jobs/jobQueue.js';

const testAdminEmail = 'test_admin_adv@agriport.in';
const testAdminMobile = '9999900001';
const testAdminPassword = 'SecureAdminPassword123';

const testCustEmail = 'test_cust_adv@agriport.in';
const testCustMobile = '9999900002';
const testCustPassword = 'SecureCustPassword123';

const testExecEmail = 'test_exec_adv@agriport.in';
const testExecMobile = '9999900003';
const testExecPassword = 'SecureExecPassword123';

const testMgrEmail = 'test_mgr_adv@agriport.in';
const testMgrMobile = '9999900004';
const testMgrPassword = 'SecureMgrPassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean and seed test data...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Cleanup
  const oldUsers = await User.find({ email: { $in: [testAdminEmail, testCustEmail, testExecEmail, testMgrEmail] } });
  const oldUserIds = oldUsers.map(u => u._id);
  await BusinessDocument.deleteMany({ userId: { $in: oldUserIds } });
  await User.deleteMany({ email: { $in: [testAdminEmail, testCustEmail, testExecEmail, testMgrEmail] } });
  await Category.deleteMany({ name: 'Test Pagination Category' });
  await Product.deleteMany({ sku: { $in: ['TEST-RICE-BASMATI', 'TEST-RICE-BROWN', 'TEST-CORN-SWEET', 'TEST-RICE-JASMINE', 'TEST-OIL-SUNFLOWER'] } });
  await IncentiveRecord.deleteMany({});
  
  console.log('✅ Cleaned up old test records.');

  // 2. Create Users
  const manager = await User.create({
    name: 'Test Manager',
    email: testMgrEmail,
    mobile: testMgrMobile,
    password: testMgrPassword,
    role: 'manager',
    status: 'active',
    region: 'North',
    target: 500000,
  });

  const executive = await User.create({
    name: 'Test Executive',
    email: testExecEmail,
    mobile: testExecMobile,
    password: testExecPassword,
    role: 'executive',
    status: 'active',
    region: 'North',
    target: 150000,
    managerId: manager._id,
    aadhaarUrl: 'http://example.com/aadhaar.jpg',
    panUrl: 'http://example.com/pan.jpg',
    kycVerified: true,
  });

  const customer = await User.create({
    name: 'Test Customer',
    email: testCustEmail,
    mobile: testCustMobile,
    password: testCustPassword,
    role: 'customer',
    status: 'active',
    managerId: executive._id, // Assign to executive for commission routing
    companyName: 'Test Wholesale Agribusiness Ltd',
    city: 'Pune',
    businessType: 'Wholesaler',
  });

  const admin = await User.create({
    name: 'Test Admin',
    email: testAdminEmail,
    mobile: testAdminMobile,
    password: testAdminPassword,
    role: 'admin',
    status: 'active',
  });

  console.log('✅ Seeding users: Manager, Executive, Customer, Admin.');

  // 3. Create Category & Products
  const category = await Category.create({
    name: 'Test Pagination Category',
    image: 'http://example.com/pagination.jpg',
    order: 10,
  });

  const productsData = [
    {
      name: 'Premium Basmati Rice',
      description: 'Long grain aromatic basmati rice from Dehradun valleys.',
      sku: 'TEST-RICE-BASMATI',
      category: category._id,
      unit: 'kg',
      moq: 10,
      stock: 100,
      priceSlabs: [{ minQty: 10, unitPrice: 85 }],
    },
    {
      name: 'Organic Brown Rice',
      description: 'Healthy whole grain brown rice grown organically.',
      sku: 'TEST-RICE-BROWN',
      category: category._id,
      unit: 'kg',
      moq: 5,
      stock: 5, // low stock for audit alert
      priceSlabs: [{ minQty: 5, unitPrice: 95 }],
    },
    {
      name: 'Sweet Golden Corn',
      description: 'Fresh farm sweet golden corn cobs direct from farms.',
      sku: 'TEST-CORN-SWEET',
      category: category._id,
      unit: 'kg',
      moq: 20,
      stock: 15, // low stock for audit alert
      priceSlabs: [{ minQty: 20, unitPrice: 45 }],
    },
    {
      name: 'Aromatic Jasmine Rice',
      description: 'Thai jasmine rice with sweet floral aroma.',
      sku: 'TEST-RICE-JASMINE',
      category: category._id,
      unit: 'kg',
      moq: 10,
      stock: 4, // low stock for audit alert
      priceSlabs: [{ minQty: 10, unitPrice: 120 }],
    },
    {
      name: 'Refined Sunflower Oil',
      description: 'Pure refined sunflower oil for everyday cooking.',
      sku: 'TEST-OIL-SUNFLOWER',
      category: category._id,
      unit: 'litre',
      moq: 10,
      stock: 150,
      priceSlabs: [{ minQty: 10, unitPrice: 140 }],
    },
  ];

  const seededProducts = await Product.create(productsData);
  console.log(`✅ Seeded ${seededProducts.length} products.`);

  // Cleanup DB connection before making API calls
  await mongoose.disconnect();

  // 4. Authenticate Customer
  console.log('\n🔐 Authenticating Customer via API...');
  const loginCustRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testCustEmail, password: testCustPassword }),
  });
  const loginCustData = await loginCustRes.json();
  if (!loginCustRes.ok) {
    throw new Error(`Customer login failed: ${loginCustData.message}`);
  }
  const custToken = loginCustData.data.accessToken;
  console.log('✅ Customer authenticated successfully.');

  // 4b. Test Get Profile
  console.log('\n👤 Testing Get Profile (GET /users/me)...');
  const profileRes = await fetch('http://localhost:5000/api/v1/users/me', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const profileData = await profileRes.json();
  if (!profileRes.ok) {
    throw new Error(`Get profile failed: ${profileData.message}`);
  }
  console.log(`✅ Get profile succeeded. User Name: ${profileData.data.fullName}`);
  if (profileData.data.fullName !== 'Test Customer') {
    throw new Error(`Expected profile name to be "Test Customer", got "${profileData.data.fullName}"`);
  }

  // 4c. Test Update Profile
  console.log('\n👤 Testing Update Profile (PATCH /users/me)...');
  const updateProfileRes = await fetch('http://localhost:5000/api/v1/users/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`,
    },
    body: JSON.stringify({ fullName: 'Test Customer Updated', city: 'Mumbai' }),
  });
  const updateProfileData = await updateProfileRes.json();
  if (!updateProfileRes.ok) {
    throw new Error(`Update profile failed: ${updateProfileData.message}`);
  }
  console.log(`✅ Update profile succeeded. New Name: ${updateProfileData.data.fullName}, City: ${updateProfileData.data.city}`);
  if (updateProfileData.data.fullName !== 'Test Customer Updated' || updateProfileData.data.city !== 'Mumbai') {
    throw new Error('Profile update fields did not persist correctly!');
  }

  // 4d. Test Document Upload
  console.log('\n📄 Testing Document Upload (POST /users/me/documents)...');
  const docFormData = new FormData();
  docFormData.append('type', 'gst_certificate');
  const blob = new Blob(['mock gst certificate pdf content'], { type: 'application/pdf' });
  docFormData.append('file', blob, 'gst_cert.pdf');

  const uploadDocRes = await fetch('http://localhost:5000/api/v1/users/me/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${custToken}`,
    },
    body: docFormData,
  });
  const uploadDocData = await uploadDocRes.json();
  if (!uploadDocRes.ok) {
    throw new Error(`Document upload failed: ${uploadDocData.message}`);
  }
  console.log(`✅ Document upload succeeded: ${uploadDocData.data.name}, File Name: ${uploadDocData.data.fileName}`);
  if (uploadDocData.data.type !== 'gst_certificate' || uploadDocData.data.status !== 'pending') {
    throw new Error('Document uploaded details are incorrect!');
  }

  // 4e. Test Get Documents List
  console.log('\n📄 Testing Get Documents List (GET /users/me/documents)...');
  const getDocsRes = await fetch('http://localhost:5000/api/v1/users/me/documents', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const getDocsData = await getDocsRes.json();
  if (!getDocsRes.ok) {
    throw new Error(`Get documents list failed: ${getDocsData.message}`);
  }
  const gstDoc = getDocsData.data.find(d => d.type === 'gst_certificate');
  if (!gstDoc || gstDoc.status !== 'pending') {
    throw new Error('GST certificate not found in documents list or has incorrect status!');
  }
  console.log('✅ Get documents list succeeded, found uploaded document.');

  // 5. Test Full-Text Search
  console.log('\n🔎 Testing Product Full-Text Search...');
  const searchRes = await fetch('http://localhost:5000/api/v1/products?search=rice&sort=relevance', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const searchData = await searchRes.json();
  if (!searchRes.ok) {
    throw new Error(`Search failed: ${searchData.message}`);
  }
  const searchProducts = searchData.data.products;
  console.log(`Found ${searchProducts.length} products matching "rice":`);
  searchProducts.forEach(p => console.log(` - SKU: ${p.sku}, Name: ${p.name}, Score: ${p.rating}`));

  // Check that only rice products are returned
  const hasRice = searchProducts.every(p => p.name.toLowerCase().includes('rice') || p.description.toLowerCase().includes('rice'));
  if (!hasRice || searchProducts.length < 3) {
    throw new Error('Full-text search did not return all matching items or returned incorrect matches!');
  }
  console.log('✅ Full-Text search and text index query verified.');

  // 6. Test Pagination Metadata
  console.log('\n📄 Testing List Pagination Utilities...');
  const paginatedRes = await fetch(`http://localhost:5000/api/v1/products?category=${category._id}&page=1&limit=2`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const paginatedData = await paginatedRes.json();
  if (!paginatedRes.ok) {
    throw new Error(`Pagination request failed: ${paginatedData.message}`);
  }

  const { products, pagination } = paginatedData.data;
  console.log('Pagination Metadata returned:', pagination);
  if (products.length !== 2) {
    throw new Error(`Expected page limit of 2 products, but got ${products.length}`);
  }
  if (pagination.total !== 5 || pagination.totalPages !== 3 || pagination.page !== 1 || pagination.limit !== 2) {
    throw new Error('Pagination metadata numbers are incorrect!');
  }
  console.log('✅ Pagination helper and response envelope verified.');

  // 7. Place Test Order to verify Event Bus & Decoupled Notification dispatches
  console.log('\n🛒 Placing a test order to trigger events...');
  const orderPayload = {
    lines: [
      {
        productId: seededProducts[0]._id, // Basmati Rice
        quantity: 15,
      }
    ],
    paymentMode: 'offline',
    deliveryAddress: 'Test Warehouse Address, Pune',
  };

  const orderRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`,
    },
    body: JSON.stringify(orderPayload),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(`Order placement failed: ${orderData.message}`);
  }
  const order = orderData.data;
  console.log(`✅ Order placed successfully! Ref: ${order.reference}, Total Amount: ₹${order.total}`);

  // 8. Fetch Pending Transactions
  console.log('\n💳 Fetching Transaction History...');
  const txRes = await fetch('http://localhost:5000/api/v1/payments/transactions', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${custToken}` },
  });
  const txData = await txRes.json();
  if (!txRes.ok) {
    throw new Error(`Transaction fetch failed: ${txData.message}`);
  }
  const transactionsList = txData.data.transactions;
  const targetTx = transactionsList.find(t => t.orderRef === order.reference);
  if (!targetTx) {
    throw new Error(`Could not find transaction corresponding to order ${order.reference}`);
  }
  console.log(`✅ Found Transaction: ID ${targetTx._id}, Status: ${targetTx.status}, Mode: ${targetTx.mode}`);

  // 9. Authenticate Admin to verify Payment & generate Commission SaleRecords
  console.log('\n🔐 Authenticating Admin to verify payment...');
  const loginAdminRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminEmail, password: testAdminPassword }),
  });
  const loginAdminData = await loginAdminRes.json();
  if (!loginAdminRes.ok) {
    throw new Error(`Admin login failed: ${loginAdminData.message}`);
  }
  const adminToken = loginAdminData.data.accessToken;
  console.log('✅ Admin authenticated.');

  console.log(`\n💸 Verifying offline payment for Transaction: ${targetTx._id}...`);
  const verifyRes = await fetch(`http://localhost:5000/api/v1/payments/admin/${targetTx._id}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) {
    throw new Error(`Payment verification failed: ${verifyData.message}`);
  }
  console.log('✅ Payment verified via API.');

  // Connect back to DB to assert database changes (SaleRecord, IncentiveRecord)
  console.log('\n🔄 Reconnecting to MongoDB to verify Commissions and Background Jobs...');
  await mongoose.connect(env.MONGO_URI);

  // 10. Check that SaleRecord was automatically created
  const saleRecords = await SaleRecord.find({ orderId: order._id });
  if (saleRecords.length === 0) {
    throw new Error('Payment verification did not trigger automated creation of SaleRecord!');
  }
  const sale = saleRecords[0];
  console.log(`✅ Found SaleRecord: Product: ${sale.product}, Line Total: ₹${sale.amount}`);
  console.log(`   Commission (Executive): ₹${sale.commissionAmount} (5%)`);
  console.log(`   Override (Manager): ₹${sale.overrideAmount} (2%)`);

  // Assert correct values
  const expectedComm = Math.round(order.lines[0].lineTotal * 0.05 * 100) / 100;
  const expectedOver = Math.round(order.lines[0].lineTotal * 0.02 * 100) / 100;
  if (sale.commissionAmount !== expectedComm || sale.overrideAmount !== expectedOver) {
    throw new Error(`Commissions/Overrides not calculated correctly! Expected Comm: ${expectedComm}, got ${sale.commissionAmount}. Expected Over: ${expectedOver}, got ${sale.overrideAmount}`);
  }
  console.log('✅ Commission and Override calculations validated successfully.');

  // 11. Run Background Jobs (Cron Calculations Mock)
  // Let's modify the SaleRecord date to last month (e.g. 2026-05) to check incentives job
  sale.date = new Date('2026-05-15T12:00:00.000Z');
  await sale.save();
  console.log('📅 Updated SaleRecord date to 2026-05 for monthly cron tests.');

  console.log('\n⏳ Manually executing calculateMonthlyIncentives("2026-05")...');
  await calculateMonthlyIncentives('2026-05');

  // Verify IncentiveRecords
  const execIncentive = await IncentiveRecord.findOne({ userId: executive._id, month: '2026-05' });
  const mgrIncentive = await IncentiveRecord.findOne({ userId: manager._id, month: '2026-05' });

  if (!execIncentive || !mgrIncentive) {
    throw new Error('Monthly Incentive calculation job failed to generate IncentiveRecord!');
  }

  console.log(`✅ IncentiveRecord for Executive: Earned: ₹${execIncentive.earnedAmount}, Target: ₹${execIncentive.targetAmount}, Sales: ₹${execIncentive.salesVolume}`);
  console.log(`✅ IncentiveRecord for Manager: Earned: ₹${mgrIncentive.earnedAmount}, Target: ₹${mgrIncentive.targetAmount}, Team Sales: ₹${mgrIncentive.teamSalesVolume}`);

  if (execIncentive.earnedAmount !== expectedComm || mgrIncentive.earnedAmount !== expectedOver) {
    throw new Error('Incentive earned amounts do not match sales commission/override totals!');
  }
  console.log('✅ Monthly Incentive calculator job run successfully verified.');

  console.log('\n📋 Running Product Stock Auditor...');
  await auditProductStockLevels();
  console.log('✅ Product stock level auditor executed successfully.');

  // Clean up
  console.log('\n🧹 Cleaning up test data...');
  await User.deleteMany({ email: { $in: [testAdminEmail, testCustEmail, testExecEmail, testMgrEmail] } });
  await Category.deleteMany({ name: 'Test Pagination Category' });
  await Product.deleteMany({ sku: { $in: ['TEST-RICE-BASMATI', 'TEST-RICE-BROWN', 'TEST-CORN-SWEET', 'TEST-RICE-JASMINE', 'TEST-OIL-SUNFLOWER'] } });
  await BusinessDocument.deleteMany({ userId: { $in: [customer._id, executive._id] } });
  await IncentiveRecord.deleteMany({});
  await Order.deleteOne({ _id: order._id });
  await Transaction.deleteOne({ orderId: order._id });
  await SaleRecord.deleteMany({ orderId: order._id });

  await mongoose.disconnect();
  console.log('\n🎉 ALL PHASE 7 INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
};

runTest().catch(err => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  mongoose.disconnect().then(() => process.exit(1));
});
