import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Category from '../src/modules/categories/category.model.js';
import Product from '../src/modules/products/product.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import Storefront from '../src/modules/storefront/storefront.model.js';
import env from '../src/config/env.js';

const testCustomerEmail = 'test_cust_tx@agriport.in';
const testCustomerMobile = '9888877777';
const testCustomerPassword = 'CustPassword123';

const testAdminEmail = 'test_admin_tx@agriport.in';
const testAdminMobile = '9888866666';
const testAdminPassword = 'AdminPassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up test data...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up any stale data from previous test runs
  await User.deleteMany({ email: { $in: [testCustomerEmail, testAdminEmail] } });
  await User.deleteMany({ mobile: { $in: [testCustomerMobile, testAdminMobile] } });
  await Product.deleteMany({ sku: 'RICE-BASMATI-002' });
  await Category.deleteOne({ name: 'Test Rice Category' });
  await Storefront.deleteMany({});

  console.log('✅ Cleaned up old test records.');

  // 1. Create a test customer and admin user directly in DB
  console.log('\n1️⃣ Creating Customer and Admin users in DB...');
  const customer = await User.create({
    name: 'John Doe Buyer',
    email: testCustomerEmail,
    mobile: testCustomerMobile,
    password: testCustomerPassword,
    role: 'customer',
    status: 'active',
    companyName: 'Doe Wholesale Corp',
    gstNumber: '27AAAAA1111A1Z1',
    city: 'Mumbai',
    businessType: 'Wholesaler',
  });
  console.log('✅ Customer created with ID:', customer._id);

  const admin = await User.create({
    name: 'Global Admin',
    email: testAdminEmail,
    mobile: testAdminMobile,
    password: testAdminPassword,
    role: 'admin',
    status: 'active',
  });
  console.log('✅ Admin created with ID:', admin._id);

  // Disconnect to run REST API tests
  await mongoose.disconnect();

  // 2. Log in both users to obtain JWT Access Tokens
  console.log('\n2️⃣ Logging in users...');
  
  // Log in customer
  const loginCustRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testCustomerEmail, password: testCustomerPassword }),
  });
  const loginCustData = await loginCustRes.json();
  const customerToken = loginCustData.data.accessToken;
  console.log('🔑 Customer Access Token obtained.');

  // Log in admin
  const loginAdminRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: testAdminEmail, password: testAdminPassword }),
  });
  const loginAdminData = await loginAdminRes.json();
  const adminToken = loginAdminData.data.accessToken;
  console.log('🔑 Admin Access Token obtained.');

  // 3. Create a Category & Product as Admin
  console.log('\n3️⃣ Creating category and product...');
  
  const categoryRes = await fetch('http://localhost:5000/api/v1/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: 'Test Rice Category', order: 1 }),
  });
  const categoryData = await categoryRes.json();
  const categoryId = categoryData.data._id;
  console.log('✅ Category created ID:', categoryId);

  // Create product with price slabs
  const productRes = await fetch('http://localhost:5000/api/v1/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Premium Basmati Rice',
      description: 'Long grain aromatic basmati rice.',
      sku: 'RICE-BASMATI-002',
      category: categoryId,
      unit: 'kg',
      stock: 100,
      priceSlabs: [
        { minQty: 1, unitPrice: 50.0 },
        { minQty: 10, unitPrice: 45.0 },
        { minQty: 50, unitPrice: 40.0 },
      ],
    }),
  });
  const productData = await productRes.json();
  const productId = productData.data._id;
  console.log('✅ Product created ID:', productId);

  // 4. Place Order 1: Small quantity (verifies no MOQ is enforced)
  console.log('\n4️⃣ Placing Order 1 (Small quantity = 5 units)...');
  const order1Res = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      lines: [
        {
          productId,
          quantity: 5,
          specifications: { Grade: 'A++' },
        },
      ],
      paymentMode: 'bank_transfer',
      deliveryAddress: '123 Wholesale Lane, Mumbai',
    }),
  });
  const order1Data = await order1Res.json();
  if (!order1Res.ok) {
    throw new Error(`Order 1 placement failed: ${order1Data.message}`);
  }
  const order1 = order1Data.data;
  console.log('✅ Order 1 placed successfully:');
  console.log('- Reference:', order1.reference);
  console.log('- Subtotal:', order1.subtotal); // Expected: 5 * 50.0 = 250
  console.log('- Tax (5%):', order1.tax);      // Expected: 12.50
  console.log('- Shipping:', order1.shipping);  // Expected: 1500 (since subtotal < 50000)
  console.log('- Total:', order1.total);        // Expected: 1762.50
  console.log('- Line Item Resolved Price:', order1.lines[0].unitPrice); // Expected: 50.0

  if (order1.lines[0].unitPrice !== 50) {
    throw new Error(`Expected unitPrice to resolve to 50, got ${order1.lines[0].unitPrice}`);
  }
  if (order1.total !== 1762.5) {
    throw new Error(`Expected total to be 1762.5, got ${order1.total}`);
  }

  // 5. Place Order 2: Bulk quantity (verifies slab pricing resolution at tier 3)
  console.log('\n5️⃣ Placing Order 2 (Bulk quantity = 60 units)...');
  const order2Res = await fetch('http://localhost:5000/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      lines: [
        {
          productId,
          quantity: 60,
        },
      ],
      paymentMode: 'cash',
      deliveryAddress: '456 Retailer Rd, Mumbai',
    }),
  });
  const order2Data = await order2Res.json();
  if (!order2Res.ok) {
    throw new Error(`Order 2 placement failed: ${order2Data.message}`);
  }
  const order2 = order2Data.data;
  console.log('✅ Order 2 placed successfully:');
  console.log('- Reference:', order2.reference);
  console.log('- Subtotal:', order2.subtotal); // Expected: 60 * 40.0 = 2400
  console.log('- Tax (5%):', order2.tax);      // Expected: 120.00
  console.log('- Shipping:', order2.shipping);  // Expected: 1500
  console.log('- Total:', order2.total);        // Expected: 4020.00
  console.log('- Line Item Resolved Price:', order2.lines[0].unitPrice); // Expected: 40.0 (Third slab: >= 50)

  if (order2.lines[0].unitPrice !== 40) {
    throw new Error(`Expected unitPrice to resolve to 40, got ${order2.lines[0].unitPrice}`);
  }

  // Connect back to DB to verify stock level
  await mongoose.connect(env.MONGO_URI);
  const updatedProduct = await Product.findById(productId);
  console.log('\n📦 Remaining product stock level in DB:', updatedProduct.stock); // Expected: 100 - 5 - 60 = 35
  if (updatedProduct.stock !== 35) {
    throw new Error(`Expected stock to be 35, got ${updatedProduct.stock}`);
  }
  await mongoose.disconnect();

  // 6. Query Customer Orders Endpoints
  console.log('\n6️⃣ Querying customer orders list...');
  const getOrdersRes = await fetch('http://localhost:5000/api/v1/orders', {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const getOrdersData = await getOrdersRes.json();
  console.log('✅ Retrieved orders count:', getOrdersData.data.orders.length);
  if (getOrdersData.data.orders.length !== 2) {
    throw new Error(`Expected 2 orders, got ${getOrdersData.data.orders.length}`);
  }

  // Get specific order details
  console.log('🔍 Fetching Order 1 details by ID...');
  const getOrderByIdRes = await fetch(`http://localhost:5000/api/v1/orders/${order1._id}`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  const getOrderByIdData = await getOrderByIdRes.json();
  console.log('- Found order reference:', getOrderByIdData.data.reference);
  if (getOrderByIdData.data.reference !== order1.reference) {
    throw new Error('Reference mismatch in details retrieval.');
  }

  // 7. Storefront Content API Testing
  console.log('\n7️⃣ Fetching storefront content (Public)...');
  const getStorefrontRes = await fetch('http://localhost:5000/api/v1/storefront');
  const getStorefrontData = await getStorefrontRes.json();
  console.log('✅ Default storefront hero title:', getStorefrontData.data.hero.titleLine1);
  const storefrontId = getStorefrontData.data._id;

  // Update Hero Content as Admin
  console.log('✍️ Updating storefront hero content as Admin...');
  const updateHeroRes = await fetch('http://localhost:5000/api/v1/storefront/hero', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      badge: 'Certified organic products',
      titleLine1: 'Pure Quality Farm Produce',
    }),
  });
  const updateHeroData = await updateHeroRes.json();
  console.log('Response titleLine1:', updateHeroData.data.hero.titleLine1);
  if (updateHeroData.data.hero.titleLine1 !== 'Pure Quality Farm Produce') {
    throw new Error('Storefront hero update failed to reflect in response.');
  }

  // Add promotional banner
  console.log('✍️ Adding storefront banner as Admin...');
  const addBannerRes = await fetch('http://localhost:5000/api/v1/storefront/banners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'Monsoon Special Offer',
      subtitle: 'Flat 10% discount on first grain procurement of the season.',
      cta: 'Explore Lots',
      accent: 'amber',
    }),
  });
  const addBannerData = await addBannerRes.json();
  console.log('✅ Banners count in response:', addBannerData.data.banners.length);
  if (addBannerData.data.banners.length !== 3) {
    throw new Error(`Expected 3 banners, got ${addBannerData.data.banners.length}`);
  }

  // 8. Database Clean up
  console.log('\n🧹 Cleaning up test database records...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteMany({ email: { $in: [testCustomerEmail, testAdminEmail] } });
  await User.deleteMany({ mobile: { $in: [testCustomerMobile, testAdminMobile] } });
  await Order.deleteMany({ customerId: customer._id });
  await Product.deleteOne({ _id: productId });
  await Category.deleteOne({ _id: categoryId });
  await Storefront.deleteOne({ _id: storefrontId });
  await mongoose.disconnect();

  console.log('\n🎉 ALL ORDERS & STOREFRONT TRANSACTION TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
