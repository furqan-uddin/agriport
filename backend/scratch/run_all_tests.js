import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const runAllTests = async () => {
  const testsDir = path.resolve('tests');
  const files = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.js'))
    .sort();

  console.log(`🔍 Found ${files.length} test files in ${testsDir}. Starting execution...\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const file of files) {
    const filePath = path.join(testsDir, file);
    console.log(`🏃 Running: ${file}...`);
    try {
      const { stdout } = await execAsync(`node "${filePath}"`, {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log(`✅ Passed: ${file}`);
      passed++;
    } catch (err) {
      console.log(`❌ Failed: ${file}`);
      console.log(`   Error: ${err.message.split('\n')[0]}`);
      failures.push({ file, error: err.message });
      failed++;
    }
  }

  console.log('\n======================================');
  console.log('📊 TEST RUN SUMMARY:');
  console.log(`   Total Tests:  ${files.length}`);
  console.log(`   Passed:       ${passed}`);
  console.log(`   Failed:       ${failed}`);
  console.log('======================================\n');

  if (failures.length > 0) {
    console.log('❌ FAILURES ENCOUNTERED:');
    failures.forEach(f => {
      console.log(`- ${f.file}`);
    });
  } else {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  }
};

runAllTests();
