import mongoose from 'mongoose';
import env from '../src/config/env.js';
import Notification from '../src/modules/notifications/notification.model.js';
import User from '../src/modules/users/user.model.js';

const runTest = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  const notifications = await Notification.find().sort({ createdAt: -1 });
  console.log(`Total Notifications in DB: ${notifications.length}`);
  notifications.forEach((n, i) => {
    console.log(`[${i}] Title: "${n.title}", RecipientId: ${n.recipientId}, Type: "${n.type}", CreatedAt: ${n.createdAt}`);
  });

  const admins = await User.find({ role: 'admin' });
  console.log('\nAdmins in DB:');
  admins.forEach(a => {
    console.log(` - ID: ${a._id}, Email: ${a.email}, Name: ${a.name}`);
  });

  const testCompany = await User.findOne({ companyName: 'test company' });
  if (testCompany) {
    console.log('\n"test company" user details:');
    console.log({
      id: testCompany._id,
      name: testCompany.name,
      email: testCompany.email,
      mobile: testCompany.mobile,
      createdAt: testCompany.createdAt,
      status: testCompany.status
    });
  } else {
    console.log('\nNo "test company" user found in DB');
  }

  await mongoose.disconnect();
};

runTest();
