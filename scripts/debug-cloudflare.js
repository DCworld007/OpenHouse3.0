#!/usr/bin/env node

/**
 * Debug script that runs the Next.js app in development mode
 * while simulating the Cloudflare Pages environment for local testing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting debug mode with Cloudflare Pages simulation');

// Ensure .env.local exists with Cloudflare simulation variables
const envLocalPath = path.join(process.cwd(), '.env.local');
let envContent = '';

if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
  
  // Check if we need to add Cloudflare simulation variables
  if (!envContent.includes('CLOUDFLARE=true')) {
    envContent += '\n# Cloudflare Pages Simulation\nCLOUDFLARE=true\nCF_PAGES=1\n';
    fs.writeFileSync(envLocalPath, envContent);
    console.log('✅ Added Cloudflare simulation variables to .env.local');
  } else {
    console.log('✅ Cloudflare simulation variables already present in .env.local');
  }
} else {
  // Create .env.local with Cloudflare simulation variables
  envContent = '# Cloudflare Pages Simulation\nCLOUDFLARE=true\nCF_PAGES=1\n';
  // Add missing required variables if any
  envContent += 'JWT_SECRET=local-debug-key\n';
  
  fs.writeFileSync(envLocalPath, envContent);
  console.log('✅ Created .env.local with Cloudflare simulation variables');
}

// Run Next.js in development mode
console.log('🔄 Starting Next.js in development mode with Cloudflare simulation...');

const envVars = {
  ...process.env,
  CLOUDFLARE: 'true',
  CF_PAGES: '1',
  DEBUG: '*'
};

// Start the Next.js dev server
const nextDev = spawn('npm', ['run', 'dev'], {
  env: envVars,
  stdio: 'inherit',
  shell: true
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down debug server...');
  nextDev.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down debug server...');
  nextDev.kill('SIGTERM');
});

nextDev.on('close', (code) => {
  console.log(`🔄 Next.js dev server exited with code ${code}`);
}); 