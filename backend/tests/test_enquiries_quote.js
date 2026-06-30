import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import Order from '../src/modules/orders/order.model.js';
import Product from '../src/modules/products/product.model.js';
import OTP from '../src/modules/auth/otp.model.js';
import env from '../src/config/env.js';

const EXEC_EMAIL = 'exec_enq_test@agriport.in';
const CUST_EMAIL = 'cust_enq_test@agriport.in';
const PASSWORD = 'SecurePassword123';
const CUST_MOBILE = '9999900000';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB for Enquiries tests...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: { $in: [EXEC_EMAIL, CUST_EMAIL] } });
  await CRMCustomer.deleteMany({ name: 'Enq Test Customer' });
  await Product.deleteMany({ name: { $in: ['Test Basmati Rice', 'Test Premium Wheat'] } });
  await Order.deleteMany({ customerPhone: CUST_MOBILE });
  await OTP.deleteMany({ mobile: CUST_MOBILE });
  console.log('✅ Cleaned up old test records.');

  // 2. Create products
  const product1 = await Product.create({
    name: 'Test Basmati Rice',
    sku: 'SKU-RICE-111',
    category: new mongoose.Types.ObjectId(),
    description: 'High quality rice',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 100 }],
    stock: 500,
    unit: 'kg',
  });
  const product2 = await Product.create({
    name: 'Test Premium Wheat',
    sku: 'SKU-WHEAT-222',
    category: new mongoose.Types.ObjectId(),
    description: 'High quality wheat',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 60 }],
    stock: 1000,
    unit: 'kg',
  });
  console.log('✅ Seeded products.');

  // 3. Seed CRM Customer BEFORE customer user signup to verify auto-linking
  const executive = await User.create({
    name: 'Exec Enquiries Test',
    email: EXEC_EMAIL,
    mobile: '8888800000',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'North',
    aadhaarUrl: '/uploads/dummy_aadhaar.png',
    panUrl: '/uploads/dummy_pan.png',
  });

  const crmCust = await CRMCustomer.create({
    ownerId: executive._id,
    name: 'Enq Test Customer',
    company: 'Enq Test Co',
    phone: CUST_MOBILE,
    city: 'Delhi',
    stage: 'lead',
  });
  console.log('✅ Seeded CRM Customer document (platformUserId: null).');

  // Create verified OTP record
  await OTP.create({
    mobile: CUST_MOBILE,
    otpCode: '123456',
    purpose: 'signup',
    verified: true,
  });

  // 4. Register customer account and verify auto-linking triggers
  console.log('\n🔑 Registering Customer...');
  const signupRes = await fetch('http://localhost:5000/api/v1/auth/signup/customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Enq Test Customer',
      email: CUST_EMAIL,
      mobile: CUST_MOBILE,
      password: PASSWORD,
      companyName: 'Enq Test Co',
      city: 'Delhi',
      businessType: 'retailer',
    }),
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error(`Customer signup failed: ${JSON.stringify(signupData)}`);
  const customer = signupData.data.user;
  console.log('✅ Customer account created.');

  // Verify that the CRM Customer record was automatically updated with platformUserId
  const linkedCrmCust = await CRMCustomer.findById(crmCust._id);
  if (!linkedCrmCust.platformUserId || linkedCrmCust.platformUserId.toString() !== customer._id.toString()) {
    throw new Error('Verification failed: Platform user was NOT automatically linked to the CRM customer.');
  }
  console.log('✅ CRM Customer platformUserId auto-linked successfully!');

  // Log in executive to get token
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

  // Log in customer to get token
  console.log('\n🔑 Logging in Customer...');
  const custLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: CUST_EMAIL, password: PASSWORD }),
  });
  const custLoginData = await custLoginRes.json();
  if (!custLoginRes.ok) throw new Error('Customer login failed');
  const custToken = custLoginData.data.accessToken;
  console.log('✅ Customer logged in.');

  // 5. Customer places an enquiry/order
  console.log('\n🛒 Customer placing an order/enquiry...');
  const orderRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`,
    },
    body: JSON.stringify({
      lines: [
        { productId: product1._id, quantity: 10, unit: 'kg' },
        { productId: product2._id, quantity: 20, unit: 'kg' },
      ],
      paymentMode: 'offline',
      deliveryAddress: 'Delhi Metro Colony',
    }),
  });
  const orderData = await orderRes.json();
  if (!orderRes.ok) throw new Error(`Customer place order failed: ${JSON.stringify(orderData)}`);
  const orderId = orderData.data._id;
  console.log(`✅ Order placed by customer with ID: ${orderId}, Ref: ${orderData.data.reference}`);

  // 6. Executive retrieves the order list
  console.log('\n📋 Executive fetching orders list...');
  const getOrdersRes = await fetch('http://localhost:5000/api/v1/orders', {
    headers: { 'Authorization': `Bearer ${execToken}` },
  });
  const getOrdersData = await getOrdersRes.json();
  if (!getOrdersRes.ok) throw new Error(`Executive get orders failed: ${JSON.stringify(getOrdersData)}`);
  
  const foundOrder = getOrdersData.data.orders.find(o => o._id === orderId);
  if (!foundOrder) {
    throw new Error('Order placed by executive-portfolio customer did not show up in executive orders list.');
  }
  console.log('✅ Placed order successfully listed in executive results.');

  // 7. Executive quotes custom prices (Confirming Enquiry)
  console.log('\n💬 Executive quoting prices and confirming order...');
  const quoteRes = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/quote`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      status: 'confirmed',
      quotedPrices: {
        [product1._id.toString()]: 95, // discount from 100
        [product2._id.toString()]: 55, // discount from 60
      },
      quotedShipping: 1200, // custom shipping fee
    }),
  });
  const quoteData = await quoteRes.json();
  if (!quoteRes.ok) throw new Error(`Executive quote failed: ${JSON.stringify(quoteData)}`);
  
  // Verify recalculated totals:
  // Subtotal = 95 * 10 + 55 * 20 = 950 + 1100 = 2050
  // Tax = 2050 * 0.05 = 102.5
  // Shipping = 1200
  // Total = 2050 + 102.5 + 1200 = 3352.5
  const expectedTotal = 3352.5;
  if (quoteData.data.status !== 'confirmed' || quoteData.data.total !== expectedTotal) {
    throw new Error(`Quoting calculations mismatch! Expected total ${expectedTotal}, got ${quoteData.data.total}`);
  }
  console.log(`✅ Order successfully confirmed and priced! Grand total recalculated correctly: ${quoteData.data.total}`);

  // 8. Executive places a new order on behalf of customer
  console.log('\n💼 Executive placing order on behalf of portfolio customer...');
  const execCreateRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      customerId: customer._id,
      lines: [{ productId: product1._id, quantity: 5, unit: 'kg' }],
      paymentMode: 'offline',
      deliveryAddress: 'Exec Office Del',
      quotedPrices: { [product1._id.toString()]: 90 },
      quotedShipping: 500,
    }),
  });
  const execCreateData = await execCreateRes.json();
  if (!execCreateRes.ok) throw new Error(`Executive create order failed: ${JSON.stringify(execCreateData)}`);
  const onBehalfId = execCreateData.data._id;
  console.log(`✅ Order placed by executive successfully. ID: ${onBehalfId}`);

  // 9. Executive cancels the confirmed order (verifying stock restoration)
  console.log('\n🚫 Executive cancelling order...');
  const initProduct1 = await Product.findById(product1._id);
  const cancelRes = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/quote`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      status: 'cancelled',
      reason: 'Customer requested cancellation.',
    }),
  });
  const cancelData = await cancelRes.json();
  if (!cancelRes.ok) throw new Error(`Executive cancel failed: ${JSON.stringify(cancelData)}`);
  
  // Verify stock restored
  const finalProduct1 = await Product.findById(product1._id);
  // Initial order had 10 qty of product1. Cancellation should add 10 back to stock.
  if (finalProduct1.stock !== initProduct1.stock + 10) {
    throw new Error(`Stock not restored correctly on cancellation! Initial: ${initProduct1.stock}, Final: ${finalProduct1.stock}`);
  }
  console.log('✅ Order cancelled and product stock levels successfully restored.');

  // Clean up database records
  await User.deleteMany({ email: { $in: [EXEC_EMAIL, CUST_EMAIL] } });
  await CRMCustomer.deleteMany({ name: 'Enq Test Customer' });
  await Product.deleteMany({ name: { $in: ['Test Basmati Rice', 'Test Premium Wheat'] } });
  await Order.deleteMany({ customerPhone: CUST_MOBILE });
  await OTP.deleteMany({ mobile: CUST_MOBILE });
  await Order.findByIdAndDelete(onBehalfId);
  console.log('🧹 Cleaned up CRM test records.');

  console.log('\n🎉 ALL SALES EXECUTIVE ENQUIRIES INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
