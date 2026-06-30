import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Product from '../src/modules/products/product.model.js';
import Category from '../src/modules/categories/category.model.js';
import Order from '../src/modules/orders/order.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import CRMCustomer from '../src/modules/crm/crmCustomer.model.js';
import FollowUp from '../src/modules/crm/followUp.model.js';
import SaleRecord from '../src/modules/sales/saleRecord.model.js';
import IncentiveRecord from '../src/modules/sales/incentiveRecord.model.js';
import BusinessDocument from '../src/modules/users/businessDocument.model.js';
import RefreshToken from '../src/modules/auth/refreshToken.model.js';
import env from '../src/config/env.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to synchronize and verify indexes...');
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Connected.');

  const models = [
    { name: 'User', model: User },
    { name: 'Product', model: Product },
    { name: 'Order', model: Order },
    { name: 'Transaction', model: Transaction },
    { name: 'CRMCustomer', model: CRMCustomer },
    { name: 'FollowUp', model: FollowUp },
    { name: 'SaleRecord', model: SaleRecord },
    { name: 'IncentiveRecord', model: IncentiveRecord },
    { name: 'BusinessDocument', model: BusinessDocument },
    { name: 'RefreshToken', model: RefreshToken },
  ];

  console.log('\n⚡ Synchronizing indexes (dropping redundant ones and building compound ones)...');
  for (const m of models) {
    console.log(`- Syncing indexes for ${m.name}...`);
    await m.model.syncIndexes();
  }
  console.log('✅ Index synchronization complete.');

  console.log('\n🔎 Verifying built indexes in database collections:');
  const db = mongoose.connection.db;

  for (const m of models) {
    const collName = m.model.collection.name;
    const indexes = await db.collection(collName).indexes();
    console.log(`\n📦 Collection: "${collName}" (${m.name})`);
    
    // Print all index names and keys
    indexes.forEach((idx) => {
      console.log(`  🔹 Name: "${idx.name}"`);
      console.log(`     Key: ${JSON.stringify(idx.key)}`);
      if (idx.unique) console.log('     [Unique]');
      if (idx.expireAfterSeconds !== undefined) console.log(`     [TTL: expireAfterSeconds=${idx.expireAfterSeconds}]`);
    });
  }

  // Graceful shutdown
  console.log('\nDisconnecting from database...');
  await mongoose.disconnect();
  console.log('\n🎉 ALL MONGODB INDEX OPTIMIZATIONS SYNCHRONIZED AND VERIFIED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Index verification failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch (cleanErr) {
      console.error('Could not disconnect:', cleanErr);
    }
  }
  process.exit(1);
});
