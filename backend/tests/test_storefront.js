import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';
import Storefront from '../src/modules/storefront/storefront.model.js';
import env from '../src/config/env.js';

const ADMIN_EMAIL = 'test_storefront_admin@agriport.in';
const PASSWORD = 'Password123';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to clean up and seed...');
  await mongoose.connect(env.MONGO_URI);

  // 1. Clean up old test data
  await User.deleteMany({ email: ADMIN_EMAIL });
  await User.deleteMany({ mobile: '9999999999' });
  // Clear any existing storefront data or set it to default for a predictable test starting point
  await Storefront.deleteMany({});
  console.log('✅ Cleaned up old test records.');

  // 2. Seed Admin
  const admin = await User.create({
    name: 'Test Storefront Admin',
    email: ADMIN_EMAIL,
    mobile: '9999999999',
    password: PASSWORD,
    role: 'admin',
    status: 'active',
  });
  console.log('✅ Seeded storefront admin user successfully.');

  // 3. Log in Admin to retrieve token
  console.log('\n🔑 Logging in Admin...');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: ADMIN_EMAIL, password: PASSWORD }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error('Admin login failed');
  const adminToken = adminLoginData.data.accessToken;
  console.log('✅ Admin logged in successfully.');

  // 4. Test GET /storefront (Public)
  console.log('\n🏪 Testing GET /storefront (Public)...');
  const getRes = await fetch('http://localhost:5000/api/v1/storefront');
  const getData = await getRes.json();
  if (!getRes.ok) throw new Error(`GET /storefront failed: ${JSON.stringify(getData)}`);
  console.log('✅ GET /storefront response: SUCCESS');
  if (!getData.data.hero || !getData.data.banners || !getData.data.trustBadges) {
    throw new Error('Storefront document structure is invalid or empty');
  }

  // 5. Test PUT /storefront/hero (Admin only)
  console.log('\n🦸 Testing PUT /storefront/hero (Admin only)...');
  const newHero = {
    badge: 'TESTING EYEBROW',
    titleLine1: 'Scale faster.',
    titleLine2: 'Save more.',
    subtitle: 'This is a test storefront integration.',
    primaryCtaLabel: 'Buy now',
    primaryCtaTo: '/products',
    secondaryCtaLabel: 'Deals',
    secondaryCtaTo: '/deals',
  };
  const putHeroRes = await fetch('http://localhost:5000/api/v1/storefront/hero', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(newHero),
  });
  const putHeroData = await putHeroRes.json();
  if (!putHeroRes.ok) throw new Error(`PUT /storefront/hero failed: ${JSON.stringify(putHeroData)}`);
  console.log('✅ PUT /storefront/hero response: SUCCESS');
  if (putHeroData.data.hero.badge !== 'TESTING EYEBROW' || putHeroData.data.hero.titleLine1 !== 'Scale faster.') {
    throw new Error('Hero fields did not update correctly');
  }

  // 6. Test POST /storefront/banners (Admin only)
  console.log('\n🏷️ Testing POST /storefront/banners (Admin only)...');
  const newBanner = {
    title: 'Test Promo Banner',
    subtitle: 'This is a test promotional banner.',
    cta: 'Grab now',
    accent: 'amber',
  };
  const postBannerRes = await fetch('http://localhost:5000/api/v1/storefront/banners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(newBanner),
  });
  const postBannerData = await postBannerRes.json();
  if (!postBannerRes.ok) throw new Error(`POST /storefront/banners failed: ${JSON.stringify(postBannerData)}`);
  console.log('✅ POST /storefront/banners response: SUCCESS');
  const createdBanner = postBannerData.data.banners.find(b => b.title === 'Test Promo Banner');
  if (!createdBanner) {
    throw new Error('Promotional banner was not added to the list');
  }
  const bannerId = createdBanner.id;
  console.log(`✅ Banner created with ID: ${bannerId}`);

  // 7. Test PUT /storefront/banners/:id (Admin only)
  console.log('\n📝 Testing PUT /storefront/banners/:id (Admin only)...');
  const updatedBannerData = {
    title: 'Updated Promo Banner Title',
    subtitle: 'Updated Subtitle',
  };
  const putBannerRes = await fetch(`http://localhost:5000/api/v1/storefront/banners/${bannerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify(updatedBannerData),
  });
  const putBannerData = await putBannerRes.json();
  if (!putBannerRes.ok) throw new Error(`PUT /storefront/banners/:id failed: ${JSON.stringify(putBannerData)}`);
  console.log('✅ PUT /storefront/banners/:id response: SUCCESS');
  const foundUpdatedBanner = putBannerData.data.banners.find(b => b.id === bannerId);
  if (!foundUpdatedBanner || foundUpdatedBanner.title !== 'Updated Promo Banner Title') {
    throw new Error('Banner fields were not updated successfully');
  }

  // 8. Test PUT /storefront/trust-badges (Admin only)
  console.log('\n🛡️ Testing PUT /storefront/trust-badges (Admin only)...');
  const newTrustBadges = [
    { id: 'tb1', icon: 'shield', label: 'Secured Payments' },
    { id: 'tb2', icon: 'verified', label: '100% Organic Products' },
  ];
  const putBadgesRes = await fetch('http://localhost:5000/api/v1/storefront/trust-badges', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ trustBadges: newTrustBadges }),
  });
  const putBadgesData = await putBadgesRes.json();
  if (!putBadgesRes.ok) throw new Error(`PUT /storefront/trust-badges failed: ${JSON.stringify(putBadgesData)}`);
  console.log('✅ PUT /storefront/trust-badges response: SUCCESS');
  if (putBadgesData.data.trustBadges.length !== 2 || putBadgesData.data.trustBadges[0].label !== 'Secured Payments') {
    throw new Error('Trust badges did not update correctly');
  }

  // 9. Test DELETE /storefront/banners/:id (Admin only)
  console.log('\n🗑️ Testing DELETE /storefront/banners/:id (Admin only)...');
  const deleteBannerRes = await fetch(`http://localhost:5000/api/v1/storefront/banners/${bannerId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
  const deleteBannerData = await deleteBannerRes.json();
  if (!deleteBannerRes.ok) throw new Error(`DELETE /storefront/banners/:id failed: ${JSON.stringify(deleteBannerData)}`);
  console.log('✅ DELETE /storefront/banners/:id response: SUCCESS');
  const foundDeletedBanner = deleteBannerData.data.banners.find(b => b.id === bannerId);
  if (foundDeletedBanner) {
    throw new Error('Banner was not deleted successfully');
  }

  // 10. Test Authorization constraints (should reject without token)
  console.log('\n🚫 Testing PUT /storefront/hero (Unauthorized request check)...');
  const failHeroRes = await fetch('http://localhost:5000/api/v1/storefront/hero', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newHero),
  });
  if (failHeroRes.status !== 401) {
    throw new Error(`Expected status 401 for unauthorized PUT request, got ${failHeroRes.status}`);
  }
  console.log('✅ Unauthorized request correctly rejected (401).');

  // Clean up admin user
  await User.deleteOne({ _id: admin._id });
  await Storefront.deleteMany({});
  console.log('🧹 Cleaned up storefront test records.');

  console.log('\n🎉 ALL STOREFRONT INTEGRATION TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
