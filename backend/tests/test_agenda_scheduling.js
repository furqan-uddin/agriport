import mongoose from 'mongoose';
import { Agenda } from 'agenda';
import env from '../src/config/env.js';

const runTest = async () => {
  console.log('🔄 Connecting to MongoDB to initialize Agenda test...');
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const db = mongoose.connection.db;
  
  // Clean up any old test jobs
  await db.collection('agendaJobs').deleteMany({ name: 'test scheduling job' });

  // Initialize Agenda
  const agenda = new Agenda({
    mongo: db,
    db: { collection: 'agendaJobs' }
  });

  let jobExecuted = false;

  // Define test job
  agenda.define('test scheduling job', async (job) => {
    console.log('👷 Executing test scheduling job inside Agenda wrapper...');
    jobExecuted = true;
  });

  // Start Agenda
  await agenda.start();
  console.log('🚀 Agenda scheduler started.');

  // Trigger job to execute immediately
  console.log('📅 Scheduling "test scheduling job" to execute now...');
  await agenda.now('test scheduling job');

  // Poll for execution status (up to 10 seconds)
  console.log('⏳ Waiting for job execution...');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (jobExecuted) {
      break;
    }
  }

  if (!jobExecuted) {
    throw new Error('Test job execution timed out inside Agenda!');
  }
  console.log('✅ Test job executed successfully.');

  // Verify database record in agendaJobs collection
  const jobRecord = await db.collection('agendaJobs').findOne({ name: 'test scheduling job' });
  if (!jobRecord) {
    throw new Error('Failed to find persisted job record in "agendaJobs" collection!');
  }
  console.log('✅ Job record verified in MongoDB collection "agendaJobs":');
  console.log(`- ID: ${jobRecord._id}`);
  console.log(`- Name: ${jobRecord.name}`);
  console.log(`- Last Run At: ${jobRecord.lastRunAt}`);

  // Shutdown Agenda and Mongoose
  console.log('\n🧹 Cleaning up test database records...');
  await db.collection('agendaJobs').deleteMany({ name: 'test scheduling job' });
  
  console.log('Stopping Agenda...');
  await agenda.stop();
  console.log('Disconnecting from database...');
  await mongoose.disconnect();

  console.log('\n🎉 ALL AGENDA BACKGROUND SCHEDULING TESTS PASSED SUCCESSFULLY!');
};

runTest().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  if (mongoose.connection.readyState !== 0) {
    try {
      const db = mongoose.connection.db;
      await db.collection('agendaJobs').deleteMany({ name: 'test scheduling job' });
      await mongoose.disconnect();
    } catch (cleanErr) {
      console.error('Could not clean up DB records:', cleanErr);
    }
  }
  process.exit(1);
});
