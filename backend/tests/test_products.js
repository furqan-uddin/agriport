import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Category from '../src/modules/categories/category.model.js';
import Product from '../src/modules/products/product.model.js';
import env from '../src/config/env.js';

const testAdminEmail = 'test_admin_prod@agriport.in';
const testAdminMobile = '9999922222';
const testAdminPassword = 'SecureAdminPassword123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to set up test data...');
  await mongoose.connect(env.MONGO_URI);

  // Clean up any stale data from previous test runs
  await User.deleteOne({ email: testAdminEmail });
  await User.deleteOne({ mobile: testAdminMobile });
  await Product.deleteMany({ name: 'Organic Punjab Wheat' });
  await Category.deleteOne({ name: 'Test Wheat Category' });

  console.log('✅ Cleaned up old test records.');

  // 1. Create a test admin user directly in DB
  console.log('\n1️⃣ Creating Admin user in DB...');
  const adminUser = await User.create({
    name: 'Test Admin User',
    email: testAdminEmail,
    mobile: testAdminMobile,
    password: testAdminPassword,
    role: 'admin',
    status: 'active',
  });
  console.log('✅ Admin user created with ID:', adminUser._id);

  // Disconnect so we don't hold the DB connection open during network requests
  await mongoose.disconnect();

  // 2. Log in to get the JWT Access Token
  console.log('\n2️⃣ Logging in to obtain Access Token...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: testAdminEmail,
      password: testAdminPassword,
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginData.message}`);
  }
  const accessToken = loginData.data.accessToken;
  console.log('🔑 Received Access Token:', accessToken.substring(0, 20) + '...');

  // 3. Create a Category
  console.log('\n3️⃣ Creating category...');
  const categoryRes = await fetch('http://localhost:5000/api/v1/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Test Wheat Category',
    }),
  });
  const categoryData = await categoryRes.json();
  if (!categoryRes.ok) {
    throw new Error(`Category creation failed: ${categoryData.message}`);
  }
  const category = categoryData.data;
  console.log('✅ Category created:', category);
  const categoryId = category._id;

  // 4. Create a Product via JSON (Name, Category, Origin, Grade)
  console.log('\n4️⃣ Creating Product with simplified fields...');
  const productRes = await fetch('http://localhost:5000/api/v1/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'Organic Punjab Wheat',
      category: categoryId,
      origin: 'India',
      grade: 'A+',
    }),
  });
  const productData = await productRes.json();
  if (!productRes.ok) {
    throw new Error(`Product creation failed: ${productData.message}`);
  }
  const product = productData.data;
  console.log('✅ Product created successfully:');
  console.log('- Name:', product.name);
  console.log('- Origin:', product.origin);
  console.log('- Grade:', product.grade);
  console.log('- IsExecutiveOnly:', product.isExecutiveOnly);

  if (product.isExecutiveOnly !== false) {
    throw new Error('Expected product to be public by default');
  }
  const productId = product._id;

  // 5. Query Products Endpoint with different filters
  console.log('\n5️⃣ Testing product retrieval & query filtering...');

  // Public Query (User side) - Should return the product
  const publicRes = await fetch('http://localhost:5000/api/v1/products');
  const publicData = await publicRes.json();
  console.log('🔍 Public Query (User side) returned count:', publicData.data.products.length);
  const existsInPublic = publicData.data.products.some((p) => p.id === productId || p._id === productId);
  if (!existsInPublic) {
    throw new Error('Created product was not found in the public user catalog!');
  }
  console.log('✅ Confirmed: Product is visible in the user section.');

  // Executive Query - Should return the product
  const execRes = await fetch(`http://localhost:5000/api/v1/products?isExecutive=true&category=${categoryId}`);
  const execData = await execRes.json();
  console.log('🔍 Executive Query returned count:', execData.data.products.length);
  const existsInExec = execData.data.products.some((p) => p.id === productId || p._id === productId);
  if (!existsInExec) {
    throw new Error('Executive query did not return the created product.');
  }
  console.log('✅ Confirmed: Product is visible in the executive panels.');

  // 6. Update product
  console.log('\n6️⃣ Updating product grade to "Super Premium"...');
  const updateRes = await fetch(`http://localhost:5000/api/v1/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ grade: 'Super Premium' }),
  });
  const updateData = await updateRes.json();
  console.log('Response Grade:', updateData.data.grade);
  if (updateData.data.grade !== 'Super Premium') {
    throw new Error(`Expected grade "Super Premium", got "${updateData.data.grade}"`);
  }

  // 7. Verify category deletion is blocked when there is an active product
  console.log('\n7️⃣ Verifying Category deletion blocks when product exists...');
  const deleteCategoryBlockedRes = await fetch(`http://localhost:5000/api/v1/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  const deleteCategoryBlockedData = await deleteCategoryBlockedRes.json();
  console.log('Response:', deleteCategoryBlockedData.message);
  if (deleteCategoryBlockedRes.ok) {
    throw new Error('Expected category deletion to fail but it succeeded.');
  }

  // 8. Delete the product
  console.log('\n8️⃣ Deleting the product (hard delete)...');
  const deleteProductRes = await fetch(`http://localhost:5000/api/v1/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  const deleteProductData = await deleteProductRes.json();
  if (!deleteProductRes.ok) {
    throw new Error(`Product delete failed: ${deleteProductData.message}`);
  }
  console.log('Response:', deleteProductData.message);

  // 9. Delete the category now that the product is deleted
  console.log('\n9️⃣ Deleting category after product is deleted...');
  const deleteCategoryRes = await fetch(`http://localhost:5000/api/v1/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  const deleteCategoryData = await deleteCategoryRes.json();
  if (!deleteCategoryRes.ok) {
    throw new Error(`Category deletion failed: ${deleteCategoryData.message}`);
  }
  console.log('Response:', deleteCategoryData.message);

  // 10. Cleanup test database records
  console.log('\n🧹 Cleaning up test database records...');
  await mongoose.connect(env.MONGO_URI);
  await User.deleteOne({ email: testAdminEmail });
  await User.deleteOne({ mobile: testAdminMobile });
  await Product.deleteOne({ _id: productId });
  await Category.deleteOne({ _id: categoryId });
  await mongoose.disconnect();

  console.log('\n🎉 ALL SIMPLIFIED PRODUCTS MODULE TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
