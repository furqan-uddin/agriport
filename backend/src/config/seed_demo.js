import mongoose from 'mongoose';
import env from './env.js';
import User from '../modules/users/user.model.js';

const seedDemoUsers = async () => {
  try {
    console.log('🔄 Connecting to MongoDB to seed demo users...');
    await mongoose.connect(env.MONGO_URI);

    const emails = [
      'admin@agriport.com',
      'arjun@agriport.com',
      'rahul@agriport.com',
      'rohan@meghatrading.com'
    ];
    const mobiles = ['9000000001', '9000000002', '9000000003', '9876543210'];

    console.log(`🧹 Deleting conflicting users by email/mobile...`);
    await User.deleteMany({
      $or: [
        { email: { $in: emails } },
        { mobile: { $in: mobiles } }
      ]
    });

    // 1. Create Admin
    const admin = await User.create({
      name: 'Platform Admin',
      email: 'admin@agriport.com',
      mobile: '9000000001',
      password: 'password',
      role: 'admin',
      status: 'active'
    });
    console.log('✅ Created Admin user: admin@agriport.com');

    // 2. Create Manager
    const manager = await User.create({
      name: 'Arjun Desai',
      email: 'arjun@agriport.com',
      mobile: '9000000002',
      password: 'password',
      role: 'manager',
      status: 'active',
      region: 'West',
      target: 1000000
    });
    console.log('✅ Created Manager user: arjun@agriport.com');

    // 3. Create Executive (assigned to Manager)
    const executive = await User.create({
      name: 'Rahul Verma',
      email: 'rahul@agriport.com',
      mobile: '9000000003',
      password: 'password',
      role: 'executive',
      status: 'active',
      region: 'West',
      target: 300000,
      managerId: manager._id,
      aadhaarUrl: 'http://example.com/aadhaar.jpg',
      panUrl: 'http://example.com/pan.jpg',
      kycVerified: true
    });
    console.log('✅ Created Executive user: rahul@agriport.com');

    // 4. Create Customer (assigned to Executive)
    const customer = await User.create({
      name: 'Rohan Mehta',
      email: 'rohan@meghatrading.com',
      mobile: '9876543210',
      password: 'password',
      role: 'customer',
      status: 'active',
      companyName: 'Megha Trading Co.',
      city: 'Pune',
      businessType: 'Wholesaler',
      managerId: executive._id
    });
    console.log('✅ Created Customer user: rohan@meghatrading.com');

    console.log('🎉 Seeding completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    process.exit(1);
  }
};

seedDemoUsers();
