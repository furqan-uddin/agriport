import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import { createOrder } from '../src/modules/orders/order.controller.js';
import env from '../src/config/env.js';

const testCustomerEmail = 'cust_order_test@agriport.in';
const testExecutiveEmail = 'exec_order_test@agriport.in';
const testCustomerMobile = '8888877777';
const testExecutiveMobile = '8888866666';
const testSku = 'TEST-PROD-SKU-100';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Cleanup old data
  console.log('🧹 Cleaning up old test data...');
  await User.deleteMany({ email: { $in: [testCustomerEmail, testExecutiveEmail] } });
  await Product.deleteMany({ sku: testSku });
  
  // Clean up orders created by test users
  const testCust = await User.findOne({ email: testCustomerEmail });
  if (testCust) {
    await Order.deleteMany({ customerId: testCust._id });
  }

  // 2. Create customer and executive users
  console.log('👤 Creating Customer user...');
  const customer = await User.create({
    name: 'Order Test Customer',
    email: testCustomerEmail,
    mobile: testCustomerMobile,
    password: 'Password123!',
    role: 'customer',
    companyName: 'Agro Distributors',
    city: 'Mumbai',
    businessType: 'Distributor',
  });

  console.log('💼 Creating Executive user...');
  const executive = await User.create({
    name: 'Order Test Executive',
    email: testExecutiveEmail,
    mobile: testExecutiveMobile,
    password: 'Password123!',
    role: 'executive',
    region: 'West',
    status: 'active',
    aadhaarUrl: 'http://dummy/aadhaar.pdf',
    panUrl: 'http://dummy/pan.pdf',
  });

  // 3. Create a test product with pricing slabs
  console.log('🌾 Creating Product with pricing slabs...');
  const product = await Product.create({
    name: 'Organic Premium Wheat',
    sku: testSku,
    category: new mongoose.Types.ObjectId(), // Dummy ID
    description: 'High-quality organic wheat from Punjab',
    unit: 'kg',
    moq: 10,
    stock: 1000,
    priceSlabs: [
      { minQty: 10, unitPrice: 120 },
      { minQty: 100, unitPrice: 110 },
      { minQty: 500, unitPrice: 100 },
    ],
    status: 'in_stock',
  });

  // 4. Test Executive Order with quoted prices & shipping overrides
  console.log('\n📦 Testing Order creation by Executive with quoted overrides...');
  
  const reqMock = {
    user: executive,
    body: {
      customerId: customer._id.toString(),
      paymentMode: 'offline',
      deliveryAddress: '456 Warehouse road, Pune',
      lines: [
        {
          productId: product._id.toString(),
          quantity: 20, // Slab price would be 120
        }
      ],
      quotedPrices: {
        [product._id.toString()]: 95, // Executive quotes 95 instead of 120
      },
      quotedShipping: 350, // Executive quotes 350 shipping fee
    }
  };

  let responseData = null;
  await new Promise((resolve, reject) => {
    const resMock = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        responseData = data;
        resolve();
        return this;
      }
    };

    const nextMock = (err) => {
      if (err) reject(err);
      else resolve();
    };

    createOrder(reqMock, resMock, nextMock);
  });

  if (!responseData || responseData.status !== 'success') {
    throw new Error('❌ Controller failed to create order: ' + JSON.stringify(responseData));
  }

  const orderId = responseData.data._id;
  console.log('✅ Order created via controller. ID:', orderId);

  // Reload order directly from database to verify Mongoose persistence
  console.log('🔍 Reloading Order from DB...');
  const savedOrder = await Order.findById(orderId);

  // Assertions
  console.log('DB quotedPrices:', savedOrder.quotedPrices);
  console.log('DB quotedShipping:', savedOrder.quotedShipping);

  if (!savedOrder.quotedPrices || savedOrder.quotedPrices.get(product._id.toString()) !== 95) {
    throw new Error('❌ quotedPrices was NOT persisted in DB or has incorrect values!');
  }
  console.log('✅ Success: quotedPrices was successfully saved in DB.');

  if (savedOrder.quotedShipping !== 350) {
    throw new Error('❌ quotedShipping was NOT persisted in DB or has incorrect value! Found: ' + savedOrder.quotedShipping);
  }
  console.log('✅ Success: quotedShipping was successfully saved in DB.');

  // Validate calculation totals
  if (savedOrder.lines[0].unitPrice !== 95) {
    throw new Error('❌ Line unit price did not resolve to quotedPrice override.');
  }
  if (savedOrder.subtotal !== 95 * 20) {
    throw new Error('❌ Subtotal is incorrect. Found: ' + savedOrder.subtotal);
  }
  if (savedOrder.shipping !== 350) {
    throw new Error('❌ Shipping price is incorrect. Found: ' + savedOrder.shipping);
  }
  console.log('✅ Success: Totals and line items calculated correctly with overrides.');

  // 5. Test Customer Order without quoted overrides (compatibility check)
  console.log('\n📦 Testing standard Order creation by Customer (no overrides)...');
  
  const reqMockCust = {
    user: customer,
    body: {
      paymentMode: 'offline',
      deliveryAddress: '123 Customer Home, Mumbai',
      lines: [
        {
          productId: product._id.toString(),
          quantity: 20, // Slab price: 120
        }
      ]
    }
  };

  let responseDataCust = null;
  await new Promise((resolve, reject) => {
    const resMockCust = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        responseDataCust = data;
        resolve();
        return this;
      }
    };

    const nextMock = (err) => {
      if (err) reject(err);
      else resolve();
    };

    createOrder(reqMockCust, resMockCust, nextMock);
  });

  const orderIdCust = responseDataCust.data._id;
  const savedOrderCust = await Order.findById(orderIdCust);

  console.log('DB quotedPrices (Customer):', savedOrderCust.quotedPrices);
  console.log('DB quotedShipping (Customer):', savedOrderCust.quotedShipping);

  // Assertions for customer order
  if (savedOrderCust.quotedPrices.size !== 0) {
    throw new Error('❌ Customer order should have empty quotedPrices map.');
  }
  if (savedOrderCust.quotedShipping !== undefined) {
    throw new Error('❌ Customer order should have undefined quotedShipping.');
  }
  if (savedOrderCust.lines[0].unitPrice !== 120) { // Slab price
    throw new Error('❌ Customer order line price did not resolve to standard slab price.');
  }
  console.log('✅ Success: Customer orders resolve to slab prices and default to empty/undefined overrides safely.');

  // Clean up
  console.log('\n🧹 Cleaning up test users and order...');
  await User.deleteMany({ email: { $in: [testCustomerEmail, testExecutiveEmail] } });
  await Product.deleteMany({ sku: testSku });
  await Order.deleteMany({ _id: { $in: [orderId, orderIdCust] } });
  await Transaction.deleteMany({ orderId: { $in: [orderId, orderIdCust] } });

  await mongoose.disconnect();
  console.log('🎉 ORDER SCHEMA ALIGNMENT VERIFICATION SUCCESSFUL!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
