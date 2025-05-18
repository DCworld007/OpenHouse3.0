#!/usr/bin/env node

/**
 * Auth Token Helper Script
 * 
 * This script helps developers test authentication by:
 * 1. Starting a local server if not already running
 * 2. Opening the test token page to set auth cookies
 * 
 * Usage:
 *   node scripts/auth-token-helper.js
 */

const { execSync } = require('child_process');
const os = require('os');

// Check if a process is already running on port 3000
function isServerRunning() {
  try {
    const platform = os.platform();
    if (platform === 'darwin' || platform === 'linux') {
      const output = execSync('lsof -i:3000 -t').toString();
      return output.trim().length > 0;
    } else if (platform === 'win32') {
      const output = execSync('netstat -ano | findstr :3000').toString();
      return output.trim().length > 0;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Open browser to the test token page
function openTestTokenPage() {
  const platform = os.platform();
  try {
    if (platform === 'darwin') {
      execSync('open http://localhost:3000/auth/test-token');
    } else if (platform === 'win32') {
      execSync('start http://localhost:3000/auth/test-token');
    } else if (platform === 'linux') {
      execSync('xdg-open http://localhost:3000/auth/test-token');
    } else {
      console.log('Please open http://localhost:3000/auth/test-token in your browser');
    }
    console.log('Test token page opened. You will be redirected to the homepage after tokens are set.');
  } catch (e) {
    console.error('Failed to open browser:', e);
    console.log('Please open http://localhost:3000/auth/test-token in your browser');
  }
}

// Main function
(async function main() {
  console.log('Auth Token Helper');
  console.log('----------------');
  
  if (!isServerRunning()) {
    console.log('Server not detected on port 3000. Starting development server...');
    try {
      // Start server in background
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (e) {
      // This will happen when user terminates the server
      console.log('Server terminated.');
      return;
    }
  } else {
    console.log('Server already running on port 3000');
    openTestTokenPage();
  }
})(); 