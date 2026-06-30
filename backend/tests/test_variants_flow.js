import mongoose from 'mongoose';
import Product from '../src/modules/products/product.model.js';
import StockRequest from '../src/modules/inventory/stockRequest.model.js';
import User from '../src/modules/users/user.model.js';
import env from '../src/config/env.js';
import { updateStockRequestStatus, createStockRequest } from '../src/modules/inventory/inventory.controller.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Setup a test product
  console.log('🌱 Creating test product...');
  await Product.deleteMany({ name: 'Test Variant Product' });
  const product = await Product.create({
    name: 'Test Variant Product',
    category: new mongoose.Types.ObjectId(),
    origin: 'India',
    grade: 'Premium',
    stock: 100,
    sizeVariants: [
      { size: 'M', stock: 50, price: 100, packingType: 'Cartoon' }
    ]
  });
  console.log('   Test product created:', product._id);

  // 2. Setup a mock admin user
  console.log('🌱 Creating test admin...');
  await User.deleteMany({ email: 'test_admin_var@agriport.in' });
  const admin = await User.create({
    name: 'Test Admin',
    email: 'test_admin_var@agriport.in',
    mobile: '9999990099',
    password: 'Password123',
    role: 'admin'
  });

  // 3. Create a Stock Request with variants and origin
  console.log('🌱 Creating stock request...');
  const reqBody = {
    productId: product._id,
    type: 'add',
    requestedChange: 40,
    notes: 'Add size variants and change origin',
    origin: 'Iceland',
    leadTimeDays: 5,
    sizeVariants: [
      { size: 'M', stock: 10, price: 100, packingType: 'Cartoon' }, // Existing - should merge
      { size: 'S', stock: 30, price: 90, packingType: 'Cartoon' }   // New - should append
    ],
    specifications: {
      'Size or Count': 'M, S'
    }
  };

  const reqCreate = { body: reqBody, user: admin };
  let createdRequest = null;

  await new Promise((resolve, reject) => {
    createStockRequest(reqCreate, {
      status: (code) => ({
        json: (data) => {
          createdRequest = data.data;
          resolve();
        }
      })
    }, (err) => { reject(err); });
  });

  console.log('   Stock request created:', createdRequest._id);

  // 4. Approve Stock Request
  console.log('🌱 Approving stock request...');
  const reqApprove = {
    params: { id: createdRequest._id },
    body: { status: 'approved' },
    user: admin
  };

  let approvedResponse = null;

  await new Promise((resolve, reject) => {
    updateStockRequestStatus(reqApprove, {
      status: (code) => ({
        json: (data) => {
          approvedResponse = data.data;
          resolve();
        }
      })
    }, (err) => { reject(err); });
  });

  console.log('   Stock request approved!');

  // 5. Verify Product
  console.log('🌱 Verifying product updates...');
  const updatedProduct = await Product.findById(product._id);
  console.log('   New stock (expected 140):', updatedProduct.stock);
  if (updatedProduct.stock !== 140) {
    throw new Error('Stock total did not increment correctly!');
  }

  console.log('   New origin (expected Iceland):', updatedProduct.origin);
  if (updatedProduct.origin !== 'Iceland') {
    throw new Error('Origin did not update correctly!');
  }

  console.log('   Lead time spec (expected 5):', updatedProduct.specifications.get('Lead Time'));
  if (updatedProduct.specifications.get('Lead Time') !== '5') {
    throw new Error('Lead Time did not update correctly!');
  }

  console.log('   Size variants count (expected 2):', updatedProduct.sizeVariants.length);
  if (updatedProduct.sizeVariants.length !== 2) {
    throw new Error('Variants length did not update correctly!');
  }

  const variantM = updatedProduct.sizeVariants.find(v => v.size === 'M');
  const variantS = updatedProduct.sizeVariants.find(v => v.size === 'S');

  console.log('   Variant M stock (expected 60):', variantM?.stock);
  if (variantM?.stock !== 60) {
    throw new Error('Variant M stock did not merge/increment!');
  }

  console.log('   Variant S stock (expected 30):', variantS?.stock);
  if (variantS?.stock !== 30) {
    throw new Error('Variant S stock did not append!');
  }

  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');

  // Cleanup
  await Product.deleteMany({ name: 'Test Variant Product' });
  await User.deleteMany({ email: 'test_admin_var@agriport.in' });
  await StockRequest.deleteMany({ _id: createdRequest._id });
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
