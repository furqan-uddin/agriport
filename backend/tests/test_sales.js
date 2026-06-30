import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Category from '../src/modules/categories/category.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import StockRequest from '../src/modules/inventory/stockRequest.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import FollowUp from '../src/modules/crm/followUp.model.js';
import SaleRecord from '../src/modules/sales/saleRecord.model.js';
import VendorPurchase from '../src/modules/inventory/vendorPurchase.model.js';
import env from '../src/config/env.js';

const ADMIN_EMAIL = 'admin_sales_test@agriport.in';
const MANAGER_EMAIL = 'manager_sales_test@agriport.in';
const EXECUTIVE_EMAIL = 'exec_sales_test@agriport.in';
const CUSTOMER_EMAIL = 'customer_sales_test@agriport.in';
const PASSWORD = 'Password123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean up and seed...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  const emails = [ADMIN_EMAIL, MANAGER_EMAIL, EXECUTIVE_EMAIL, CUSTOMER_EMAIL];
  await User.deleteMany({ email: { $in: emails } });
  
  const oldCategory = await Category.findOne({ name: 'Sales Test Category' });
  if (oldCategory) {
    await Product.deleteMany({ category: oldCategory._id });
    await Category.deleteOne({ _id: oldCategory._id });
  }
  await Product.deleteMany({ sku: 'SALESTESTPROD' });

  // Clean up other collections
  await CRMCustomer.deleteMany({});
  await FollowUp.deleteMany({});
  await SaleRecord.deleteMany({});
  await VendorPurchase.deleteMany({});
  await Order.deleteMany({});
  await Transaction.deleteMany({});
  await StockRequest.deleteMany({});

  console.log('✅ Cleaned up old test records.');

  // 2. Seed Data
  const testCategory = await Category.create({
    name: 'Sales Test Category',
    slug: 'sales-test-category',
  });

  const testProduct = await Product.create({
    name: 'Sales Test Product',
    description: 'Product for Sales Testing',
    sku: 'SALESTESTPROD',
    category: testCategory._id,
    unit: 'kg',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 100 }],
    stock: 50,
  });

  const admin = await User.create({
    name: 'Sales Test Admin',
    email: ADMIN_EMAIL,
    mobile: '1212121212',
    password: PASSWORD,
    role: 'admin',
    status: 'active',
  });

  const manager = await User.create({
    name: 'Sales Test Manager',
    email: MANAGER_EMAIL,
    mobile: '1313131313',
    password: PASSWORD,
    role: 'manager',
    status: 'active',
    region: 'West',
    target: 500000,
  });

  const executive = await User.create({
    name: 'Sales Test Executive',
    email: EXECUTIVE_EMAIL,
    mobile: '1414141414',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'West',
    target: 150000,
    managerId: manager._id,
    aadhaarUrl: '/uploads/mock_aadhaar.pdf',
    panUrl: '/uploads/mock_pan.png',
  });

  const customer = await User.create({
    name: 'Sales Test Customer',
    email: CUSTOMER_EMAIL,
    mobile: '1515151515',
    password: PASSWORD,
    role: 'customer',
    status: 'active',
    companyName: 'Sales Customer Co',
    city: 'Mumbai',
    businessType: 'Wholesaler',
    managerId: executive._id, // customer is assigned to the executive
  });

  console.log('✅ Seeded admin, manager, executive, customer, product, and category successfully.');

  // 3. Obtain JWT Access Tokens
  console.log('\n🔑 Logging in users...');
  
  const login = async (email) => {
    const res = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: email, password: PASSWORD }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Login failed for ${email}`);
    return data.data.accessToken;
  };

  const adminToken = await login(ADMIN_EMAIL);
  const managerToken = await login(MANAGER_EMAIL);
  const execToken = await login(EXECUTIVE_EMAIL);
  console.log('✅ Retained access tokens for Admin, Manager, and Executive.');

  // 4. CRM operations as Executive
  console.log('\n👤 CRM Operations (Executive)...');
  // A. Create CRM customer
  const createCustomerRes = await fetch('http://localhost:5000/api/v1/crm/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      name: 'CRM Lead Customer',
      company: 'Lead Co',
      phone: '1515151515',
      city: 'Pune',
      gst: '27BBBBB2222B2Z2',
    }),
  });
  const createCustomerData = await createCustomerRes.json();
  if (!createCustomerRes.ok) throw new Error('Create CRM customer failed');
  const crmCustomerId = createCustomerData.data._id;
  console.log('✅ CRM Customer created:', createCustomerData.data.name);

  // B. Get CRM customers list
  const getCrmCustomersRes = await fetch('http://localhost:5000/api/v1/crm/customers', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const getCrmCustomersData = await getCrmCustomersRes.json();
  if (!getCrmCustomersRes.ok) throw new Error('Get CRM customers failed');
  console.log(`✅ CRM Customer list length (expected 1): ${getCrmCustomersData.data.length}`);
  if (getCrmCustomersData.data.length !== 1) throw new Error('CRM listing count mismatch');

  // C. Update CRM Customer Stage
  const updateCustomerRes = await fetch(`http://localhost:5000/api/v1/crm/customers/${crmCustomerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({ stage: 'prospect' }),
  });
  const updateCustomerData = await updateCustomerRes.json();
  if (!updateCustomerRes.ok) throw new Error('Update CRM Customer stage failed');
  console.log(`✅ CRM Customer stage updated: ${updateCustomerData.data.stage}`);
  if (updateCustomerData.data.stage !== 'prospect') throw new Error('CRM stage mismatch');

  // D. Create a Follow-up task
  const createFollowUpRes = await fetch('http://localhost:5000/api/v1/crm/follow-ups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      crmCustomerId,
      dueAt: new Date(Date.now() + 86400000).toISOString(), // due tomorrow
      type: 'call',
      note: 'Discuss pricing slabs details',
    }),
  });
  const createFollowUpData = await createFollowUpRes.json();
  if (!createFollowUpRes.ok) throw new Error(`Create follow-up failed: ${JSON.stringify(createFollowUpData)}`);
  const followUpId = createFollowUpData.data._id;
  console.log('✅ Follow-up created for customer:', createFollowUpData.data.customer);

  // E. Get Follow-ups list
  const getFollowUpsRes = await fetch('http://localhost:5000/api/v1/crm/follow-ups?isDone=false', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const getFollowUpsData = await getFollowUpsRes.json();
  if (!getFollowUpsRes.ok) throw new Error('Get follow-ups failed');
  console.log(`✅ Follow-ups count (expected 1): ${getFollowUpsData.data.length}`);

  // F. Complete Follow-up task
  const updateFollowUpRes = await fetch(`http://localhost:5000/api/v1/crm/follow-ups/${followUpId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({ isDone: true, note: 'Call completed. Customer interested.' }),
  });
  const updateFollowUpData = await updateFollowUpRes.json();
  if (!updateFollowUpRes.ok) throw new Error('Update follow-up failed');
  console.log(`✅ Follow-up completed state: ${updateFollowUpData.data.isDone}`);
  if (!updateFollowUpData.data.isDone) throw new Error('Follow-up completion mismatch');

  // 5. Vendor Procurement & Inventory Stock Request
  console.log('\n📦 Vendor Procurement & Stock Requests...');
  // A. Create Vendor Purchase with received status (should increase stock)
  const buyRes = await fetch('http://localhost:5000/api/v1/inventory/vendor-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      vendorName: 'Global Agro Exports',
      productId: testProduct._id.toString(),
      quantity: 30,
      unit: 'kg',
      buyPrice: 60,
      purchaseDate: new Date().toISOString(),
      status: 'received',
    }),
  });
  const buyData = await buyRes.json();
  if (!buyRes.ok) throw new Error('Vendor purchase logging failed');
  console.log('✅ Vendor purchase logged successfully.');

  // Verify stock incremented (initial 50 + purchase 30 = 80)
  const productAfterBuy = await Product.findById(testProduct._id);
  console.log(`Product stock after purchase (expected 80): ${productAfterBuy.stock}`);
  if (productAfterBuy.stock !== 80) throw new Error('Vendor purchase stock addition failed');

  // B. Raise Stock Request
  const stockReqRes = await fetch('http://localhost:5000/api/v1/inventory/stock-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      productId: testProduct._id.toString(),
      type: 'add',
      requestedChange: 20,
      notes: 'Increase safety stock',
    }),
  });
  const stockReqData = await stockReqRes.json();
  if (!stockReqRes.ok) throw new Error('Stock request submission failed');
  console.log('✅ Stock request raised by Executive. ID:', stockReqData.data._id);

  // 6. Custom Order Quotation Checkout by Executive
  console.log('\n🛍️ Placing Custom order enquiry by Executive...');
  const orderRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      lines: [
        {
          productId: testProduct._id.toString(),
          quantity: 10,
        },
      ],
      paymentMode: 'offline',
      deliveryAddress: 'Sales Warehouse, West Zone, Mumbai',
      customerId: customer._id.toString(),
      quotedPrices: {
        [testProduct._id.toString()]: 150, // override price to 150 (normal is 100)
      },
      quotedShipping: 500, // override shipping fee to 500
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error(`Custom checkout failed: ${JSON.stringify(orderData)}`);
  const orderId = orderData.data._id;
  const orderRef = orderData.data.reference;
  console.log(`✅ Order checkout completed. Total: ${orderData.data.total}, Reference: ${orderRef}`);
  
  // Verify totals: subtotal: 10 * 150 = 1500. tax: 1500 * 0.05 = 75. shipping: 500. total: 1500 + 75 + 500 = 2075.
  console.log(`Order calculated total (expected 2075): ${orderData.data.total}`);
  if (orderData.data.total !== 2075) throw new Error('Quotation calculations mismatch');

  // Verify stock decremented (80 - 10 = 70)
  const productAfterOrder = await Product.findById(testProduct._id);
  console.log(`Product stock after order (expected 70): ${productAfterOrder.stock}`);
  if (productAfterOrder.stock !== 70) throw new Error('Stock decrement failed');

  // Find transaction
  const transaction = await Transaction.findOne({ orderId });
  if (!transaction) throw new Error('Transaction not generated for checkout');

  // 7. Verify Payment as Admin to credit sales commission
  console.log('\n💵 Admin verifying transaction payment...');
  const verifyPaymentRes = await fetch(`http://localhost:5000/api/v1/payments/admin/${transaction._id}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  if (!verifyPaymentRes.ok) throw new Error('Offline payment verification failed');
  console.log('✅ Payment verified by Admin. Sales credited.');

  // 8. Fetch Executive statistics and sales list
  console.log('\n📊 Checking Executive Stats and Sales records...');
  const execStatsRes = await fetch('http://localhost:5000/api/v1/sales/executive/stats', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const execStatsData = await execStatsRes.json();
  if (!execStatsRes.ok) throw new Error('Fetch executive stats failed');
  
  // Expected sales revenue: 1500. Expected deals: 1. Expected commission: 1500 * 0.05 = 75.
  console.log(`Exec Stats Revenue (expected 1500): ${execStatsData.data.revenue}`);
  console.log(`Exec Stats Deals (expected 1): ${execStatsData.data.deals}`);
  console.log(`Exec Stats Incentive Earned (expected 75): ${execStatsData.data.incentiveEarned}`);
  if (execStatsData.data.revenue !== 1500 || execStatsData.data.deals !== 1 || execStatsData.data.incentiveEarned !== 75) {
    throw new Error('Executive stats mismatch');
  }

  // Get Executive Sales Records
  const execRecordsRes = await fetch('http://localhost:5000/api/v1/sales/executive/records', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const execRecordsData = await execRecordsRes.json();
  if (!execRecordsRes.ok) throw new Error('Get executive sales records failed');
  console.log(`Exec Sales Records count (expected 1): ${execRecordsData.data.length}`);
  if (execRecordsData.data.length !== 1) throw new Error('Sales record list count mismatch');

  // Fetch Incentives series
  const execIncRes = await fetch('http://localhost:5000/api/v1/sales/executive/incentives', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const execIncData = await execIncRes.json();
  if (!execIncRes.ok) throw new Error('Fetch incentives series failed');
  console.log('Incentives series points count:', execIncData.data.length);

  // 9. Fetch Manager statistics, team performance and roster
  console.log('\n📊 Checking Manager Stats and Team overview...');
  const managerStatsRes = await fetch('http://localhost:5000/api/v1/sales/manager/stats', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${managerToken}` },
  });
  const managerStatsData = await managerStatsRes.json();
  if (!managerStatsRes.ok) throw new Error('Fetch manager stats failed');

  // Expected team revenue: 1500. Expected team size: 1 active. Expected override: 1500 * 0.02 = 30.
  console.log(`Manager Stats Team Revenue (expected 1500): ${managerStatsData.data.revenue}`);
  console.log(`Manager Stats Team Size (expected 1): ${managerStatsData.data.teamSize}`);
  console.log(`Manager Stats Overrides Commission (expected 30): ${managerStatsData.data.incentiveEarned}`);
  if (managerStatsData.data.revenue !== 1500 || managerStatsData.data.teamSize !== 1 || managerStatsData.data.incentiveEarned !== 30) {
    throw new Error('Manager stats mismatch');
  }

  // Get manager's assigned team performance gauges
  const managerExecsRes = await fetch('http://localhost:5000/api/v1/sales/manager/executives', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${managerToken}` },
  });
  const managerExecsData = await managerExecsRes.json();
  if (!managerExecsRes.ok) throw new Error('Fetch team executives failed');
  console.log(`Manager Executive Roster length (expected 1): ${managerExecsData.data.length}`);
  console.log(`Assigned Executive Sales amount (expected 1500): ${managerExecsData.data[0].sales}`);
  if (managerExecsData.data.length !== 1 || managerExecsData.data[0].sales !== 1500) {
    throw new Error('Manager team roster data mismatch');
  }

  // Get Manager Sales Records
  const managerRecordsRes = await fetch('http://localhost:5000/api/v1/sales/manager/records', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${managerToken}` },
  });
  const managerRecordsData = await managerRecordsRes.json();
  if (!managerRecordsRes.ok) throw new Error('Get manager sales records failed');
  console.log(`Manager Team Sales Records count (expected 1): ${managerRecordsData.data.length}`);

  console.log('\n🧹 Cleaning up database test records...');
  await User.deleteMany({ email: { $in: emails } });
  await Category.deleteOne({ _id: testCategory._id });
  await Product.deleteOne({ _id: testProduct._id });
  await CRMCustomer.deleteOne({ _id: crmCustomerId });
  await FollowUp.deleteOne({ _id: followUpId });
  await SaleRecord.deleteMany({ orderId });
  await VendorPurchase.deleteMany({ productId: testProduct._id });
  await Order.deleteOne({ _id: orderId });
  await Transaction.deleteOne({ orderId });
  await StockRequest.deleteMany({ productId: testProduct._id });

  console.log('\n🎉 ALL SALES PORTAL WORKSPACE TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
