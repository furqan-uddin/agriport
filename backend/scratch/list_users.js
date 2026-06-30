import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/modules/users/user.model.js';

const runTest = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  const users = await User.find().sort({ createdAt: -1 });
  console.log(`Total Users in DB: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`[${i}] Name: "${u.name}", Email: "${u.email}", Mobile: "${u.mobile}", Role: "${u.role}", Status: "${u.status}", CreatedAt: ${u.createdAt}`);
  });

  await mongoose.disconnect();
};

runTest();
