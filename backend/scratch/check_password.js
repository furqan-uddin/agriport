import mongoose from 'mongoose';
import env from '../src/config/env.js';
import User from '../src/modules/users/user.model.js';

const runTest = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to DB');

  const adminUser = await User.findOne({ email: 'admin@agriport.com' }).select('+password');
  if (adminUser) {
    console.log('Admin found:', adminUser.email);
    const matches = await adminUser.comparePassword('password');
    console.log(`Password 'password' matches? ${matches}`);
    console.log(`Hashed password in DB: ${adminUser.password}`);
  } else {
    console.log('Admin user not found!');
  }

  const executiveUser = await User.findOne({ email: 'rahul@agriport.com' }).select('+password');
  if (executiveUser) {
    console.log('Executive found:', executiveUser.email);
    const matches = await executiveUser.comparePassword('password');
    console.log(`Password 'password' matches? ${matches}`);
    console.log(`Hashed password in DB: ${executiveUser.password}`);
  } else {
    console.log('Executive user not found!');
  }

  await mongoose.disconnect();
};

runTest();
