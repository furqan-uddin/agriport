import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Order from '../src/modules/orders/order.model.js';
import Product from '../src/modules/products/product.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import SystemSetting from '../src/modules/sales/systemSetting.model.js';
import { getSalesSettings, updateSalesSettings } from '../src/modules/users/user.controller.js';
import { createOrder, getOrders, quoteOrder, getOrderById } from '../src/modules/orders/order.controller.js';
import { getCrmCustomers, createCrmCustomer, updateCrmCustomer, createFollowUp } from '../src/modules/crm/crm.controller.js';
import env from '../src/config/env.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  const testSuffix = Date.now();
  const execAEmail = `exec_a_${testSuffix}@agriport.in`;
  const execBEmail = `exec_b_${testSuffix}@agriport.in`;
  const custEmail = `cust_shared_${testSuffix}@agriport.in`;

  console.log('🧹 Cleaning old test data...');
  await User.deleteMany({
    $or: [
      { email: { $in: [execAEmail, execBEmail, custEmail] } },
      { mobile: { $in: ['9988776601', '9988776602', '9988776603'] } }
    ]
  });
  await SystemSetting.deleteMany({ key: { $in: ['gst_rate', 'shipping_threshold', 'base_shipping_charge'] } });

  const execAMobile = `9988` + String(testSuffix).slice(-6);
  const execBMobile = `9988` + String(testSuffix + 1).slice(-6);
  const custMobile = `9988` + String(testSuffix + 2).slice(-6);

  console.log('🌱 Creating Sales Executives A and B...');
  const execA = await User.create({
    name: 'Exec A',
    email: execAEmail,
    mobile: execAMobile,
    password: 'Password123',
    role: 'executive',
    region: 'North',
    aadhaarUrl: 'http://example.com/aadhaar.jpg',
    panUrl: 'http://example.com/pan.jpg'
  });

  const execB = await User.create({
    name: 'Exec B',
    email: execBEmail,
    mobile: execBMobile,
    password: 'Password123',
    role: 'executive',
    region: 'South',
    aadhaarUrl: 'http://example.com/aadhaar.jpg',
    panUrl: 'http://example.com/pan.jpg'
  });

  console.log('🌱 Creating Platform Customer...');
  const customer = await User.create({
    name: 'Shared Buyer Client',
    email: custEmail,
    mobile: custMobile,
    password: 'Password123',
    role: 'customer',
    companyName: 'B2B Shared LLC',
    city: 'Mumbai',
    businessType: 'Retailer',
    status: 'active'
  });

  console.log('🌱 Creating a Product for catalog orders...');
  const product = await Product.create({
    name: `Test Agro Product ${testSuffix}`,
    sku: `SKU-${testSuffix}`,
    description: 'Fresh organic lot',
    unit: 'kg',
    stock: 1000,
    priceSlabs: [{ minQty: 1, unitPrice: 100 }],
    category: new mongoose.Types.ObjectId() // mock category
  });

  // Mock Request/Response helpers
  let resData = null;
  let resolvePromise;
  let responsePromise;

  const resetPromise = () => {
    resData = null;
    responsePromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
  };

  const createMockRes = () => ({
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      resData = data;
      resolvePromise(data);
      return this;
    },
  });

  const mockNext = (err) => {
    if (err) {
      console.error('❌ Error passed to next():', err);
      resolvePromise(null);
      throw err;
    }
  };

  console.log('🧪 Step 1: Testing Dynamic Settings update (GST 18%, Shipping Threshold 10k, charge 500)...');
  resetPromise();
  await updateSalesSettings(
    {
      body: {
        gstRate: 18,
        shippingThreshold: 10000,
        baseShipping: 500,
      },
    },
    createMockRes(),
    mockNext
  );
  await responsePromise;

  console.log('🧪 Step 2: Testing getSalesSettings...');
  resetPromise();
  await getSalesSettings({}, createMockRes(), mockNext);
  const settings = await responsePromise;
  console.log(`   Fetched Settings - GST: ${settings.data.gstRate}%, Threshold: ₹${settings.data.shippingThreshold}, Base Shipping: ₹${settings.data.baseShipping}`);
  if (settings.data.gstRate !== 18 || settings.data.shippingThreshold !== 10000 || settings.data.baseShipping !== 500) {
    throw new Error('Failed to save or fetch dynamic system settings!');
  }

  console.log('🧪 Step 3: Placing Order (subtotal 0 < threshold 10k, should apply ₹500 shipping & 18% GST)...');
  resetPromise();
  await createOrder(
    {
      user: customer,
      body: {
        customerId: customer._id,
        paymentMode: 'offline',
        deliveryAddress: 'Mumbai Warehouse',
        lines: [
          {
            productId: product._id,
            quantity: 80, // storefront inquiry
          },
        ],
      },
    },
    createMockRes(),
    mockNext
  );
  const orderObj = await responsePromise;
  const orderId = orderObj.data._id;
  console.log(`   Order created - Subtotal: ₹${orderObj.data.subtotal}, Tax: ₹${orderObj.data.tax}, Shipping: ₹${orderObj.data.shipping}, Total: ₹${orderObj.data.total}`);
  
  // Tax should be 8000 * 18% = 1440
  // Shipping should be 500 (since 8000 < threshold 10000)
  // Total should be 8000 + 1440 + 500 = 9940
  if (orderObj.data.tax !== 1440 || orderObj.data.shipping !== 500 || orderObj.data.total !== 9940) {
    throw new Error('Order checkout calculations failed to apply dynamic GST and shipping rates correctly!');
  }

  console.log('🧪 Step 4: Placing Order 2 (subtotal 0 < threshold 10k, should apply ₹500 shipping & 18% GST)...');
  resetPromise();
  await createOrder(
    {
      user: customer,
      body: {
        customerId: customer._id,
        paymentMode: 'offline',
        deliveryAddress: 'Mumbai Warehouse',
        lines: [
          {
            productId: product._id,
            quantity: 120, // storefront inquiry
          },
        ],
      },
    },
    createMockRes(),
    mockNext
  );
  const orderObj2 = await responsePromise;
  console.log(`   Order 2 created - Subtotal: ₹${orderObj2.data.subtotal}, Tax: ₹${orderObj2.data.tax}, Shipping: ₹${orderObj2.data.shipping}, Total: ₹${orderObj2.data.total}`);
  
  // Tax should be 12000 * 18% = 2160
  // Shipping should be 0
  // Total should be 12000 + 2160 = 14160
  if (orderObj2.data.tax !== 2160 || orderObj2.data.shipping !== 0 || orderObj2.data.total !== 14160) {
    throw new Error('Order 2 checkout calculations failed to apply free shipping threshold correctly!');
  }

  console.log('🧪 Step 5: Testing CRM Customer creation by Exec A and retrieve by Exec B (Shared Pool - Option 1)...');
  // Exec A creates customer lead
  resetPromise();
  await createCrmCustomer(
    {
      user: execA,
      body: {
        name: 'Shared Lead Prospect',
        company: 'Shared Prospect Corp',
        phone: '9988776655',
        city: 'Delhi',
      },
    },
    createMockRes(),
    mockNext
  );
  const crmCust = await responsePromise;
  
  // Exec B retrieves customer list (should see Exec A\'s lead because pool is shared)
  resetPromise();
  await getCrmCustomers(
    {
      user: execB,
      query: {},
    },
    createMockRes(),
    mockNext
  );
  const execBList = await responsePromise;
  const foundInB = execBList.data.find(c => c._id.toString() === crmCust.data._id.toString());
  console.log(`   Exec B customer list contains Exec A's lead: ${Boolean(foundInB)}`);
  if (!foundInB) {
    throw new Error('Executive CRM customer portfolio is not shared!');
  }

  console.log('🧪 Step 5b: Testing CRM Customer update by Exec B (should allow editing Exec A\'s lead)...');
  resetPromise();
  await updateCrmCustomer(
    {
      user: execB,
      params: { id: crmCust.data._id },
      body: {
        stage: 'prospect',
        city: 'Noida',
      },
    },
    createMockRes(),
    mockNext
  );
  await responsePromise;

  const updatedCust = await CRMCustomer.findById(crmCust.data._id);
  console.log(`   Updated stage: "${updatedCust.stage}" (Expected: "prospect"), city: "${updatedCust.city}" (Expected: "Noida")`);
  if (updatedCust.stage !== 'prospect' || updatedCust.city !== 'Noida') {
    throw new Error('Failed to update CRM customer details as Exec B!');
  }

  console.log('🧪 Step 5c: Testing Follow-up scheduling by Exec B for the customer (should allow creation)...');
  resetPromise();
  await createFollowUp(
    {
      user: execB,
      body: {
        crmCustomerId: crmCust.data._id,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        type: 'call',
        note: 'Shared follow up check',
      },
    },
    createMockRes(),
    mockNext
  );
  const createdFollowUpObj = await responsePromise;
  console.log(`   Follow-up scheduled successfully: ${Boolean(createdFollowUpObj && createdFollowUpObj.data)}`);
  if (!createdFollowUpObj || !createdFollowUpObj.data) {
    throw new Error('Failed to create follow-up task as Exec B!');
  }

  console.log('🧪 Step 6: Testing Order query by Exec B (should see the customer order in shared pick-up queue)...');
  resetPromise();
  await getOrders(
    {
      user: execB,
      query: {},
    },
    createMockRes(),
    mockNext
  );
  const execBOrders = await responsePromise;
  const foundOrder = execBOrders.data.orders.find(o => o._id.toString() === orderId.toString());
  console.log(`   Exec B sees the placed order in queue: ${Boolean(foundOrder)}`);
  if (!foundOrder) {
    throw new Error('Executive cannot see storefront enquiries in shared pickup queue!');
  }

  console.log('🧪 Step 6b: Testing getOrderById as Exec B (should allow viewing specific order details)...');
  resetPromise();
  await getOrderById(
    {
      user: execB,
      params: { id: orderId },
    },
    createMockRes(),
    mockNext
  );
  const detailedOrder = await responsePromise;
  console.log(`   Exec B successfully viewed order details: ${Boolean(detailedOrder && detailedOrder.data)}`);
  if (!detailedOrder || !detailedOrder.data) {
    throw new Error('Executive was blocked from viewing storefront enquiry by ID!');
  }

  console.log('🧪 Step 7: Testing Order quoting by Exec B (should allow quotation & auto-assign Exec B as handler)...');
  resetPromise();
  await quoteOrder(
    {
      user: execB,
      params: { id: orderId },
      body: {
        status: 'confirmed',
        quotedPrices: {
          [product._id.toString()]: 150 // increase price to 150
        },
        quotedShipping: 300 // override shipping to 300
      },
    },
    createMockRes(),
    mockNext
  );
  const quotedResult = await responsePromise;
  
  const verifiedOrder = await Order.findById(orderId);
  console.log(`   Quoted Order handler ID: "${verifiedOrder.executiveId}" (Expected: Exec B ID "${execB._id}")`);
  console.log(`   Quoted Order subtotal: ₹${verifiedOrder.subtotal} (Expected: 80 * 150 = ₹12000)`);
  console.log(`   Quoted Order tax (dynamic 18%): ₹${verifiedOrder.tax} (Expected: 12000 * 18% = ₹2160)`);
  console.log(`   Quoted Order shipping: ₹${verifiedOrder.shipping} (Expected: ₹300)`);
  console.log(`   Quoted Order total: ₹${verifiedOrder.total} (Expected: 12000 + 2160 + 300 = ₹14460)`);

  if (verifiedOrder.executiveId.toString() !== execB._id.toString()) {
    throw new Error('Order quoting failed to auto-assign executive handler!');
  }
  if (verifiedOrder.subtotal !== 12000 || verifiedOrder.tax !== 2160 || verifiedOrder.shipping !== 300 || verifiedOrder.total !== 14460) {
    throw new Error('Order quoting failed to calculate overridden values and dynamic tax rates correctly!');
  }

  console.log('🧹 Cleaning database...');
  await User.deleteMany({ email: { $in: [execAEmail, execBEmail, custEmail] } });
  await Product.deleteOne({ _id: product._id });
  await Order.deleteMany({ customerId: customer._id });
  await CRMCustomer.deleteMany({ ownerId: { $in: [execA._id, execB._id] } });
  await SystemSetting.deleteMany({ key: { $in: ['gst_rate', 'shipping_threshold', 'base_shipping_charge'] } });

  console.log('🎉 ALL DYNAMIC SETTINGS AND SHARED POOL TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
