#!/usr/bin/env node

/**
 * Local Cloudflare Pages Test Environment
 * 
 * This script sets up a more accurate simulation of the Cloudflare Pages environment
 * by using a custom Express server that intercepts requests similar to our middleware.
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Define simple colored console output since chalk might be ESM only
const log = {
  green: (text) => console.log(`\x1b[32m${text}\x1b[0m`),
  yellow: (text) => console.log(`\x1b[33m${text}\x1b[0m`),
  red: (text) => console.log(`\x1b[31m${text}\x1b[0m`)
};

// Kill any existing processes on port 3000 and 3001
function killPortProcess(port) {
  try {
    const command = process.platform === 'win32' 
      ? `taskkill /F /PID $(netstat -ano | findstr :${port} | awk '{print $5}')`
      : `lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs -r kill -9`;
    
    require('child_process').execSync(command, { stdio: 'ignore' });
    log.green(`✓ Cleared port ${port}`);
  } catch (e) {
    // Ignore errors if process doesn't exist
  }
}

// Setup environment for testing
async function setupEnvironment() {
  // Kill any existing processes that might block our ports
  killPortProcess(3000);
  killPortProcess(3001);
  
  // Set Cloudflare environment variables
  process.env.CLOUDFLARE = 'true';
  process.env.CF_PAGES = 'true';
  process.env.NODE_ENV = 'development';
  
  // Ensure .env.local has Cloudflare variables
  try {
    let envContent = '';
    if (fs.existsSync('.env.local')) {
      envContent = fs.readFileSync('.env.local', 'utf8');
    }
    
    if (!envContent.includes('CLOUDFLARE=true')) {
      fs.appendFileSync('.env.local', '\nCLOUDFLARE=true\n');
    }
    
    if (!envContent.includes('CF_PAGES=true')) {
      fs.appendFileSync('.env.local', 'CF_PAGES=true\n');
    }
    
    log.green('✓ Environment variables set for Cloudflare simulation');
  } catch (error) {
    console.error('Error setting environment variables:', error);
  }
  
  // Force localStorage in browser
  log.yellow('! When the app loads, run this in browser console:');
  log.yellow('  localStorage.setItem("debug_cloudflare", "true")');
}

// Start the Next.js development server
function startNextServer() {
  log.green('Starting Next.js development server on port 3001...');
  
  const nextProcess = spawn('next', ['dev', '-p', '3001'], { 
    stdio: 'inherit',
    shell: true,
    env: { 
      ...process.env,
      CLOUDFLARE: 'true',
      CF_PAGES: 'true',
      NODE_ENV: 'development'
    }
  });
  
  nextProcess.on('error', (error) => {
    console.error('Failed to start Next.js server:', error);
  });
  
  return nextProcess;
}

// Create an Express server that simulates Cloudflare Pages
function createSimulationServer(port) {
  const app = express();
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`[CF Simulation] ${req.method} ${req.url}`);
    next();
  });
  
  // Intercept data requests that cause 500 errors in Cloudflare
  app.get('/_next/data/**/index.json', (req, res) => {
    console.log('[CF Simulation] Intercepting index.json data request');
    res.json({
      pageProps: {
        __N_SSG: true
      }
    });
  });
  
  // Return demo user for authentication endpoints
  app.all(['/api/auth/me', '/api/me'], (req, res) => {
    console.log('[CF Simulation] Intercepting auth/me request - returning demo user');
    res.json({
      authenticated: true,
      user: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/150'
      }
    });
  });
  
  // Proxy all other requests to the Next.js server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
    logLevel: 'silent'
  }));
  
  // Start the server
  app.listen(port, () => {
    log.green(`✓ Cloudflare Pages simulation running on http://localhost:${port}`);
    log.green(`  Next.js is running on port 3001, but access the app through port ${port}`);
    log.yellow(`  This simulates how Cloudflare Pages handles your requests`);
    log.yellow(`\n  Open your browser to http://localhost:${port} to test\n`);
  });
}

// Run everything
async function run() {
  log.green('🚀 Starting Cloudflare Pages local simulation');
  await setupEnvironment();
  
  const nextProcess = startNextServer();
  
  // Wait for Next.js to start before launching the proxy
  setTimeout(() => {
    createSimulationServer(3000);
  }, 5000);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log.yellow('\nShutting down...');
    nextProcess.kill();
    process.exit(0);
  });
}

run().catch(console.error); 