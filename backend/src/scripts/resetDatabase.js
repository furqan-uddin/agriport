import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../modules/users/user.model.js';
import Product from '../modules/products/product.model.js';
import Order from '../modules/orders/order.model.js';
import Transaction from '../modules/payments/transaction.model.js';
import VendorPurchase from '../modules/inventory/vendorPurchase.model.js';
import StockRequest from '../modules/inventory/stockRequest.model.js';
import CRMCustomer from '../modules/crm/crmCustomer.model.js';
import FollowUp from '../modules/crm/followUp.model.js';
import Notification from '../modules/notifications/notification.model.js';
import IncentiveRecord from '../modules/sales/incentiveRecord.model.js';
import SaleRecord from '../modules/sales/saleRecord.model.js';
import Storefront from '../modules/storefront/storefront.model.js';
import BusinessDocument from '../modules/users/businessDocument.model.js';
import OTP from '../modules/auth/otp.model.js';
import RefreshToken from '../modules/auth/refreshToken.model.js';

const resetDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB to reset database...');
    await mongoose.connect(env.MONGO_URI);

    console.log('🧹 Clearing transaction, log, crm, and activity collections...');
    await Order.deleteMany({});
    await Transaction.deleteMany({});
    await VendorPurchase.deleteMany({});
    await StockRequest.deleteMany({});
    await CRMCustomer.deleteMany({});
    await FollowUp.deleteMany({});
    await Notification.deleteMany({});
    await IncentiveRecord.deleteMany({});
    await SaleRecord.deleteMany({});
    await Storefront.deleteMany({});
    await BusinessDocument.deleteMany({});
    await OTP.deleteMany({});
    await RefreshToken.deleteMany({});

    console.log('🧹 Clearing users except seeded demo users...');
    const seededMobiles = ['9000000001', '9000000002', '9000000003', '9876543210'];
    const seededEmails = [
      'admin@agriport.com',
      'arjun@agriport.com',
      'rahul@agriport.com',
      'rohan@meghatrading.com'
    ];

    const userResult = await User.deleteMany({
      $and: [
        { mobile: { $nin: seededMobiles } },
        { email: { $nin: seededEmails } }
      ]
    });
    console.log(`✅ Deleted ${userResult.deletedCount} non-seeded user accounts.`);

    console.log('🔄 Deleting all products and categories from database...');
    const productResult = await Product.deleteMany({});
    const Category = (await import('../modules/categories/category.model.js')).default;
    const categoryResult = await Category.deleteMany({});
    console.log(`✅ Deleted ${productResult.deletedCount} products and ${categoryResult.deletedCount} categories.`);

    console.log('🎉 Database reset completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();
