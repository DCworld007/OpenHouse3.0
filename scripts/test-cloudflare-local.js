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
  
  // Create a mock auth cookie to simulate logged-in state
  log.yellow('! Important: When app loads, run this in browser console to simulate login:');
  log.yellow('  localStorage.setItem("debug_cloudflare", "true")');
  log.yellow('  document.cookie = "auth_token=demo-token-for-testing; path=/"');
}

// Demo user response that will be used for all auth endpoints
const demoUserResponse = {
  authenticated: true,
  user: {
    id: 'demo-user',
    email: 'demo@example.com',
    name: 'Demo User',
    picture: 'https://via.placeholder.com/150'
  }
};

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
      NODE_ENV: 'development',
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'test_client_id' // Provide a test client ID
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
  
  // IMPORTANT: Set cookie middleware to ensure cookies work
  app.use((req, res, next) => {
    // Add a mock auth cookie if not present
    if (req.headers.cookie && !req.headers.cookie.includes('auth_token=')) {
      const newCookie = 'auth_token=demo-token-for-testing; Path=/; HttpOnly';
      res.setHeader('Set-Cookie', newCookie);
    }
    next();
  });
  
  // Special handling for various API routes
  
  // Handle data requests that cause 500 errors in Cloudflare
  app.get('/_next/data/**/index.json', (req, res) => {
    console.log('[CF Simulation] Intercepting index.json data request');
    res.json({
      pageProps: {
        __N_SSG: true
      }
    });
  });
  
  // Authentication endpoints - ALL auth-related endpoints return success with demo user
  app.all([
    '/api/auth/me', 
    '/api/me', 
    '/api/auth/login', 
    '/api/login',
    '/api/simple-auth/*'
  ], (req, res) => {
    console.log(`[CF Simulation] Intercepting ${req.path} - returning demo user`);
    
    // Set auth cookie for login endpoints
    if (req.path.includes('/login')) {
      res.cookie('auth_token', 'demo-token-for-testing', {
        path: '/',
        httpOnly: true,
        maxAge: 86400 * 1000, // 1 day
        sameSite: 'strict'
      });
    }
    
    // For login endpoints, also return a token
    const response = {
      ...demoUserResponse,
      ...(req.path.includes('/login') ? { token: 'demo-token-for-testing' } : {})
    };
    
    res.json(response);
  });
  
  // Fallback data endpoints
  app.all('/api/planning-room/*', (req, res) => {
    console.log(`[CF Simulation] Intercepting planning room request: ${req.path}`);
    
    // Return mock room data based on the endpoint
    if (req.path.includes('/cards')) {
      res.json([
        { id: 'card-1', type: 'text', content: 'Demo Card 1', groupId: req.params.groupId },
        { id: 'card-2', type: 'text', content: 'Demo Card 2', groupId: req.params.groupId }
      ]);
    } else {
      res.json({
        id: req.params.groupId || 'demo-room',
        name: 'Demo Planning Room',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  app.all('/api/rooms', (req, res) => {
    console.log('[CF Simulation] Intercepting rooms request');
    res.json([
      { id: 'demo-room-1', name: 'Demo Planning Room 1', createdAt: new Date().toISOString() },
      { id: 'demo-room-2', name: 'Demo Planning Room 2', createdAt: new Date().toISOString() }
    ]);
  });
  
  // Add default headers to all responses to mimic Cloudflare
  app.use((req, res, next) => {
    res.setHeader('CF-Simulation', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });
  
  // Proxy all other requests to the Next.js server
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    onProxyReq: (proxyReq, req, res) => {
      // Add cloudflare simulation header to proxy requests
      proxyReq.setHeader('CF-Simulation', 'true');
      
      // If we have a demo cookie, add it to the request
      if (!req.headers.cookie || !req.headers.cookie.includes('auth_token=')) {
        proxyReq.setHeader('Cookie', 
          `${req.headers.cookie || ''};auth_token=demo-token-for-testing`);
      }
    }
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