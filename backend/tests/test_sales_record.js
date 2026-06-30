import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import env from '../src/config/env.js';

const EXEC_EMAIL = 'exec_sales_test@agriport.in';
const CUST_EMAIL = 'cust_sales_test@agriport.in';
const PASSWORD = 'SecurePassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB for Sales Operations (New Sale) tests...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: { $in: [EXEC_EMAIL, CUST_EMAIL] } });
  await Product.deleteMany({ name: 'Test Sales Product' });
  await CRMCustomer.deleteMany({ name: 'Test Sales Customer' });
  console.log('✅ Cleaned up old test records.');

  // 2. Create product
  const product = await Product.create({
    name: 'Test Sales Product',
    sku: 'SKU-SAL-999',
    category: new mongoose.Types.ObjectId(),
    description: 'High quality product for sales logging test',
    moq: 1,
    priceSlabs: [{ minQty: 1, unitPrice: 150 }],
    stock: 100,
    unit: 'bags',
  });
  console.log(`✅ Seeded product with initial stock: ${product.stock} ${product.unit}`);

  // 3. Seed Executive user
  const executive = await User.create({
    name: 'Exec Sales Test',
    email: EXEC_EMAIL,
    mobile: '8888811111',
    password: PASSWORD,
    role: 'executive',
    status: 'active',
    region: 'South',
    aadhaarUrl: '/uploads/dummy_aadhaar.png',
    panUrl: '/uploads/dummy_pan.png',
  });
  console.log('✅ Seeded Executive account.');

  // 4. Seed Customer user
  const customer = await User.create({
    name: 'Test Sales Customer',
    email: CUST_EMAIL,
    mobile: '9999911111',
    password: PASSWORD,
    role: 'customer',
    status: 'active',
    companyName: 'Test Sales Co',
    city: 'Pune',
    businessType: 'Retailer',
  });
  console.log('✅ Seeded Customer account.');

  // 5. Seed CRM Portfolio assignment
  const crmCustomer = await CRMCustomer.create({
    ownerId: executive._id,
    name: 'Test Sales Customer',
    company: 'Test Sales Co',
    phone: '9999911111',
    city: 'Pune',
    stage: 'active',
    platformUserId: customer._id,
  });
  console.log('✅ Seeded CRM Portfolio link between Executive and Customer.');

  // 6. Log in executive to get token
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

  // 7. Test POST /orders as Executive (Record Sale) with custom prices below threshold (should include shipping)
  console.log('\n📦 Recording portfolio sale (quantity: 40, price: 120)...');
  const createSaleRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      customerId: customer._id,
      lines: [
        {
          productId: product._id,
          quantity: 40,
          unit: 'bags',
        },
      ],
      paymentMode: 'offline',
      deliveryAddress: 'Test Customer Warehouse, Pune',
      quotedPrices: {
        [product._id.toString()]: 120,
      },
      quotedShipping: 1500,
    }),
  });
  const createSaleData = await createSaleRes.json();
  if (!createSaleRes.ok) throw new Error(`Sale creation failed: ${JSON.stringify(createSaleData)}`);
  
  const orderId = createSaleData.data._id;
  console.log(`✅ Sale recorded with Order ID: ${orderId}. Status: ${createSaleData.data.status}`);

  // Verify stock decremented to 60 (100 - 40)
  let productAfterSale = await Product.findById(product._id);
  if (productAfterSale.stock !== 60) {
    throw new Error(`Catalog stock not decremented correctly! Expected 60, got ${productAfterSale.stock}`);
  }
  console.log(`✅ Product stock atomically decremented to ${productAfterSale.stock}`);

  // Verify financial totals
  // subtotal = 40 * 120 = 4800. tax = 4800 * 0.05 = 240. shipping = 1500. total = 6540.
  const orderDoc = await Order.findById(orderId);
  if (orderDoc.subtotal !== 4800 || orderDoc.tax !== 240 || orderDoc.shipping !== 1500 || orderDoc.total !== 6540) {
    throw new Error(`Financial totals incorrect! Expected subtotal 4800, tax 240, shipping 1500, total 6540. Got: ${JSON.stringify(orderDoc)}`);
  }
  console.log(`✅ Financial calculations verified. Subtotal: ${orderDoc.subtotal}, Tax: ${orderDoc.tax}, Shipping: ${orderDoc.shipping}, Total: ${orderDoc.total}`);

  // 8. Test insufficient stock rejection
  console.log('\n🔒 Testing stock limitation check (exceeding stock of 60)...');
  const createExcessRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      customerId: customer._id,
      lines: [
        {
          productId: product._id,
          quantity: 70,
          unit: 'bags',
        },
      ],
      paymentMode: 'offline',
      deliveryAddress: 'Test Customer Warehouse, Pune',
      quotedPrices: {
        [product._id.toString()]: 120,
      },
    }),
  });
  if (createExcessRes.status !== 400) {
    throw new Error(`Expected status 400 Bad Request, got ${createExcessRes.status}`);
  }
  console.log('✅ Overselling correctly blocked by backend.');

  // 9. Test POST /orders with subtotal above ₹50,000 (should have 0 shipping)
  console.log('\n📦 Recording sale above shipping threshold (quantity: 60, price: 900)...');
  const createFreeShipRes = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${execToken}`,
    },
    body: JSON.stringify({
      customerId: customer._id,
      lines: [
        {
          productId: product._id,
          quantity: 60,
          unit: 'bags',
        },
      ],
      paymentMode: 'offline',
      deliveryAddress: 'Test Customer Warehouse, Pune',
      quotedPrices: {
        [product._id.toString()]: 900,
      },
      quotedShipping: 0,
    }),
  });
  const freeShipData = await createFreeShipRes.json();
  if (!createFreeShipRes.ok) throw new Error(`Sale creation with free shipping failed: ${JSON.stringify(freeShipData)}`);

  // subtotal = 60 * 900 = 54000. tax = 54000 * 0.05 = 2700. shipping = 0. total = 56700.
  const freeShipOrderDoc = await Order.findById(freeShipData.data._id);
  if (freeShipOrderDoc.subtotal !== 54000 || freeShipOrderDoc.tax !== 2700 || freeShipOrderDoc.shipping !== 0 || freeShipOrderDoc.total !== 56700) {
    throw new Error(`Free shipping totals incorrect! Got: ${JSON.stringify(freeShipOrderDoc)}`);
  }
  console.log(`✅ Free shipping totals verified. Subtotal: ${freeShipOrderDoc.subtotal}, Tax: ${freeShipOrderDoc.tax}, Shipping: ${freeShipOrderDoc.shipping}, Total: ${freeShipOrderDoc.total}`);

  // Verify stock is now 0
  let finalProductStock = await Product.findById(product._id);
  if (finalProductStock.stock !== 0) {
    throw new Error(`Stock level not decremented to 0! Got ${finalProductStock.stock}`);
  }
  console.log(`✅ Product stock level successfully reduced to 0.`);

  // 10. Clean up database records
  await User.deleteMany({ email: { $in: [EXEC_EMAIL, CUST_EMAIL] } });
  await Product.deleteMany({ name: 'Test Sales Product' });
  await CRMCustomer.deleteMany({ name: 'Test Sales Customer' });
  await Order.deleteMany({ customerId: customer._id });
  await Transaction.deleteMany({ customerId: customer._id });
  console.log('🧹 Cleaned up database records.');

  console.log('\n🎉 ALL PORTFOLIO SALES / NEW SALE SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
