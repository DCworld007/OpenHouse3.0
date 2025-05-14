#!/usr/bin/env node

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function runCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('Output:', stdout);
    if (stderr) console.error('Error:', stderr);
    return stdout;
  } catch (error) {
    console.error('Error executing command:', error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.error('Error output:', error.stderr);
    return null;
  }
}

async function main() {
  console.log('Testing authentication endpoints...');
  console.log('--------------------------------');
  
  console.log('1. Checking debug-cookies endpoint (unauthenticated)...');
  await runCommand('curl -s http://localhost:3000/api/auth/debug-cookies');
  
  console.log('--------------------------------');
  console.log('2. Checking /api/auth/me endpoint (should fail with 401)...');
  await runCommand('curl -s http://localhost:3000/api/auth/me');
  
  console.log('--------------------------------');
  console.log('3. Testing with a mock cookie...');
  await runCommand('curl -s -H "Cookie: auth_token=test-token" http://localhost:3000/api/auth/debug-cookies');
  
  console.log('--------------------------------');
  console.log('4. Testing the me endpoint with the mock cookie (should fail token validation)...');
  await runCommand('curl -s -H "Cookie: auth_token=test-token" http://localhost:3000/api/auth/me');
  
  console.log('--------------------------------');
  console.log('Test complete. Check the middleware logs for more information.');
}

main().catch(console.error); 