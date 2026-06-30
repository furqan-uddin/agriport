import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Transaction from '../src/modules/payments/transaction.model.js';
import VendorPurchase from '../src/modules/inventory/vendorPurchase.model.js';
import StockRequest from '../src/modules/inventory/stockRequest.model.js';
import { getSalesSeries } from '../src/modules/reports/reports.controller.js';
import env from '../src/config/env.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  const testEmailPrefix = 'test_reports_dynamic_' + Date.now();
  const managerEmail = `${testEmailPrefix}_mgr@agriport.in`;

  console.log('🧹 Cleaning up old test data...');
  await User.deleteMany({ email: managerEmail });
  await User.deleteMany({ mobile: '2222220001' });
  await Transaction.deleteMany({ description: 'TEST-SALES-REPORT-TRANSACTION' });
  await VendorPurchase.deleteMany({ vendorName: 'TEST-REPORTS-VENDOR' });
  await StockRequest.deleteMany({ productName: 'TEST-REPORTS-PRODUCT' });

  // Calculate expected sums before seeding
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const existingSales = await Transaction.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const existingSalesSum = existingSales[0]?.total || 0;
  const expectedRevenue = existingSalesSum + 1000;

  const existingPurchases = await VendorPurchase.aggregate([
    { $match: { status: 'received', purchaseDate: { $gte: currentMonthStart, $lte: currentMonthEnd } } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const existingPurchasesSum = existingPurchases[0]?.total || 0;
  const expectedPurchased = existingPurchasesSum + 600;

  const existingArrivals = await StockRequest.aggregate([
    {
      $match: {
        status: 'approved',
        type: 'add',
        reviewedAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
      }
    },
    { $group: { _id: null, total: { $sum: '$requestedChange' } } }
  ]);
  const existingArrivalsSum = existingArrivals[0]?.total || 0;
  const expectedArrivals = existingArrivalsSum + 20;

  console.log('🌱 Seeding test database records...');
  // Create Manager
  const manager = await User.create({
    name: 'Test Manager',
    email: managerEmail,
    mobile: '2222220001',
    password: 'Password123',
    role: 'manager',
    status: 'active',
    region: 'North',
  });

  const orderId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  // Create Transaction (Revenue)
  await Transaction.create({
    customerId: manager._id,
    orderId,
    orderRef: 'REF-TX-TEST',
    amount: 1000,
    status: 'paid',
    paymentMethod: 'offline',
    reference: 'REF-TX-TEST',
    description: 'TEST-SALES-REPORT-TRANSACTION',
    createdAt: new Date(),
  });

  // Create Vendor Purchase (Purchased)
  await VendorPurchase.create({
    purchasedBy: manager._id,
    vendorName: 'TEST-REPORTS-VENDOR',
    productId,
    productName: 'TEST-REPORTS-PRODUCT',
    quantity: 10,
    unit: 'kg',
    buyPrice: 60,
    total: 600,
    purchaseDate: new Date(),
    status: 'received',
  });

  // Create Stock Request (Arrivals)
  await StockRequest.create({
    productId,
    productName: 'TEST-REPORTS-PRODUCT',
    category: 'Fruits',
    requesterId: manager._id,
    requesterRole: 'manager',
    type: 'add',
    currentStock: 50,
    requestedChange: 20,
    status: 'approved',
    reviewedBy: manager._id,
    reviewedAt: new Date(),
  });

  console.log('🔍 Testing getSalesSeries reporting query...');
  let resData = null;
  let resolveResponse;
  const responsePromise = new Promise((resolve) => {
    resolveResponse = resolve;
  });

  const mockRes = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      resData = data;
      resolveResponse(data);
      return this;
    },
  };

  const mockNext = (err) => {
    if (err) {
      console.error('❌ Error passed to next():', err);
      resolveResponse(null);
      throw err;
    }
  };

  getSalesSeries({ query: { interval: 'month' } }, mockRes, mockNext);
  await responsePromise;

  if (!resData) {
    throw new Error('resData is null after getSalesSeries call');
  }

  console.log('📊 Resulting series points:', JSON.stringify(resData.data, null, 2));

  // Find the label for the current month (format YYYY-MM)
  const currentMonthLabel = new Date().toISOString().substring(0, 7);
  const currentPoint = resData.data.find(pt => pt.label === currentMonthLabel);

  if (!currentPoint) {
    throw new Error(`Data point for current month (${currentMonthLabel}) not found in series`);
  }

  console.log(`   Sales Revenue: ₹${currentPoint.revenue} (Expected: ${expectedRevenue})`);
  if (currentPoint.revenue !== expectedRevenue) {
    throw new Error(`Sales revenue mismatch! Expected ${expectedRevenue}, got ${currentPoint.revenue}`);
  }

  console.log(`   Vendor Purchased: ₹${currentPoint.purchased} (Expected: ${expectedPurchased})`);
  if (currentPoint.purchased !== expectedPurchased) {
    throw new Error(`Vendor purchased mismatch! Expected ${expectedPurchased}, got ${currentPoint.purchased}`);
  }

  console.log(`   Stock Arrived Quantity: ${currentPoint.onArrival} (Expected: ${expectedArrivals})`);
  if (currentPoint.onArrival !== expectedArrivals) {
    throw new Error(`Stock arrived mismatch! Expected ${expectedArrivals}, got ${currentPoint.onArrival}`);
  }

  console.log('✅ getSalesSeries dynamic analytics test passed successfully!');

  console.log('🧹 Cleaning up database...');
  await User.deleteMany({ email: managerEmail });
  await User.deleteMany({ mobile: '2222220001' });
  await Transaction.deleteMany({ description: 'TEST-SALES-REPORT-TRANSACTION' });
  await VendorPurchase.deleteMany({ vendorName: 'TEST-REPORTS-VENDOR' });
  await StockRequest.deleteMany({ productName: 'TEST-REPORTS-PRODUCT' });

  console.log('🎉 ALL REPORTING ANALYTICS DYNAMIC TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
