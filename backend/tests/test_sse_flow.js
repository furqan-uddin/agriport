import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Notification from '../src/modules/notifications/notification.model.js';
import eventBus from '../src/events/index.js';
import env from '../src/config/env.js';
import { registerClient, unregisterClient } from '../src/modules/notifications/sseManager.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Setup mock Admin
  console.log('🌱 Setting up mock admin...');
  await User.deleteMany({ email: 'test_admin_sse@agriport.in' });
  const admin = await User.create({
    name: 'Test Admin SSE',
    email: 'test_admin_sse@agriport.in',
    mobile: '9999992222',
    password: 'Password123',
    role: 'admin',
    status: 'active'
  });

  // Clear existing notifications
  await Notification.deleteMany({ recipientId: admin._id });

  // 2. Setup Mock Express Response to capture SSE writes
  console.log('🌱 Setting up Mock Connection...');
  const writtenMessages = [];
  const mockRes = {
    writeHead: (status, headers) => {
      console.log(`   [Handshake] Response Head: ${status}`, headers);
    },
    write: (chunk) => {
      writtenMessages.push(chunk);
    },
    end: () => {
      console.log('   [Stream] Closed');
    }
  };

  // 3. Register our mock stream connection
  registerClient(admin._id, mockRes);

  // 4. Trigger order.placed event
  console.log('🌱 Emitting mock order.placed event...');
  const mockOrder = {
    _id: new mongoose.Types.ObjectId(),
    reference: 'ORD-TEST-SSE',
    customerName: 'Test customer',
    customerId: new mongoose.Types.ObjectId(),
    total: 15000,
    paymentMode: 'offline',
    lines: []
  };
  eventBus.emit('order.placed', mockOrder);

  // Wait a small timeout to let the event listener write to the DB and push to the stream
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('🌱 Validating captured SSE stream messages...');
  console.log('   Captured messages length:', writtenMessages.length);
  
  // We expect:
  // - notification_created event
  // - invalidate event (with ['Order', 'Product'] tags)
  
  const hasInvalidateEvent = writtenMessages.some(msg => msg.includes('event: invalidate') && msg.includes('["Order","Product"]'));
  const hasNotificationEvent = writtenMessages.some(msg => msg.includes('event: notification_created') && msg.includes('New Enquiry Placed'));

  console.log(`   Has Invalidate event: ${hasInvalidateEvent}`);
  console.log(`   Has Notification event: ${hasNotificationEvent}`);

  if (!hasInvalidateEvent) {
    throw new Error('SSE stream did not receive cache invalidation payload!');
  }
  if (!hasNotificationEvent) {
    throw new Error('SSE stream did not receive live notification payload!');
  }

  // 5. Clean up
  console.log('🌱 Cleaning up SSE connections and database...');
  unregisterClient(admin._id, mockRes);
  await User.deleteMany({ email: 'test_admin_sse@agriport.in' });
  await Notification.deleteMany({ recipientId: admin._id });
  await mongoose.disconnect();

  console.log('🎉 SSE REAL-TIME SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
