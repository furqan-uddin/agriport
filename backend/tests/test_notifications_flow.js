import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Notification from '../src/modules/notifications/notification.model.js';
import eventBus from '../src/events/index.js';
import env from '../src/config/env.js';
import { getNotifications, markAsRead, markAllAsRead } from '../src/modules/notifications/notification.controller.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Setup mock Admin and Customer
  console.log('🌱 Setting up mock users...');
  await User.deleteMany({ email: { $in: ['test_admin_notif@agriport.in', 'test_cust_notif@agriport.in'] } });
  
  const admin = await User.create({
    name: 'Test Admin Notif',
    email: 'test_admin_notif@agriport.in',
    mobile: '9999991111',
    password: 'Password123',
    role: 'admin',
    status: 'active'
  });

  const customer = await User.create({
    name: 'Test Customer Notif',
    email: 'test_cust_notif@agriport.in',
    mobile: '9999991112',
    password: 'Password123',
    role: 'customer',
    status: 'pending',
    companyName: 'Test Notif Corp',
    city: 'Mumbai',
    businessType: 'Wholesaler'
  });

  // Clear existing notifications for these users
  await Notification.deleteMany({ recipientId: { $in: [admin._id, customer._id] } });

  // 2. Trigger customer.registered event
  console.log('🌱 Emitting customer.registered event...');
  eventBus.emit('customer.registered', customer);

  // Wait a small timeout to let the event listener write to the database
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Verify notification was created for admin
  const adminNotifs = await Notification.find({ recipientId: admin._id });
  console.log(`   Admin notification count: ${adminNotifs.length} (Expected: 1)`);
  if (adminNotifs.length !== 1) {
    throw new Error('Notification was not created for admin on customer registration!');
  }
  console.log('   Notification title:', adminNotifs[0].title);
  if (adminNotifs[0].title !== 'New Customer Signup') {
    throw new Error('Notification title did not match expectations!');
  }

  // 3. Test getNotifications controller
  console.log('🌱 Calling getNotifications controller...');
  const reqGet = { user: admin, query: {} };
  let getResponse = null;
  
  await new Promise((resolve) => {
    getNotifications(reqGet, {
      status: (code) => ({
        json: (data) => {
          getResponse = data.data;
          resolve();
        }
      })
    });
  });

  console.log('   Retrieved count:', getResponse.notifications.length);
  if (getResponse.notifications.length !== 1) {
    throw new Error('getNotifications controller returned incorrect count!');
  }

  // 4. Test markAsRead controller
  console.log('🌱 Calling markAsRead controller...');
  const notifId = getResponse.notifications[0]._id;
  const reqMark = { user: admin, params: { id: notifId } };
  let markResponse = null;

  await new Promise((resolve, reject) => {
    markAsRead(reqMark, {
      status: (code) => ({
        json: (data) => {
          markResponse = data.data;
          resolve();
        }
      })
    }, (err) => reject(err));
  });

  console.log('   Is read (expected true):', markResponse.read);
  if (markResponse.read !== true) {
    throw new Error('Notification was not marked as read!');
  }

  const updatedNotif = await Notification.findById(notifId);
  if (updatedNotif.read !== true) {
    throw new Error('Notification read status was not persisted in DB!');
  }

  console.log('🎉 ALL NOTIFICATION TESTS PASSED SUCCESSFULLY!');

  // Cleanup
  await User.deleteMany({ email: { $in: ['test_admin_notif@agriport.in', 'test_cust_notif@agriport.in'] } });
  await Notification.deleteMany({ recipientId: { $in: [admin._id, customer._id] } });
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
