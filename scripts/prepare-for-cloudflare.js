#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * This script prepares the application for Cloudflare Pages deployment
 */

// Ensure functions/_routes.json exists
const routesPath = path.join(process.cwd(), 'functions', '_routes.json');
if (!fs.existsSync(path.dirname(routesPath))) {
  fs.mkdirSync(path.dirname(routesPath), { recursive: true });
}

// Write the _routes.json file
fs.writeFileSync(
  routesPath,
  JSON.stringify(
    {
      version: 1,
      include: ['/*'],
      exclude: ['/_next/*', '/static/*']
    },
    null,
    2
  )
);
console.log('✅ Created functions/_routes.json');

// Ensure public/_redirects exists
const redirectsPath = path.join(process.cwd(), 'public', '_redirects');
if (!fs.existsSync(path.dirname(redirectsPath))) {
  fs.mkdirSync(path.dirname(redirectsPath), { recursive: true });
}

// Write the _redirects file
fs.writeFileSync(
  redirectsPath,
  '/* /index.html 200\n' +
  '/api/* /api/:splat 200\n'
);
console.log('✅ Created public/_redirects');

// Update .node-version
fs.writeFileSync(
  path.join(process.cwd(), '.node-version'),
  '18.x\n'
);
console.log('✅ Created .node-version');

// Create Cloudflare Pages config file
const pagesConfigPath = path.join(process.cwd(), '.cloudflare', 'pages.js');
if (!fs.existsSync(path.dirname(pagesConfigPath))) {
  fs.mkdirSync(path.dirname(pagesConfigPath), { recursive: true });
}

// Write the pages config
fs.writeFileSync(
  pagesConfigPath,
  `module.exports = {
  // Keep public directory contents in the deployment
  includeFiles: ['public/**/*'],
  // Build command
  buildCommand: 'npm run build',
  // Directory to serve static assets from
  outputDirectory: '.next',
  // Environment variables
  env: {
    JWT_SECRET: process.env.JWT_SECRET || 'Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz',
  },
};\n`
);
console.log('✅ Created .cloudflare/pages.js');

console.log('\n🚀 Application prepared for Cloudflare Pages deployment!');
console.log('\nMake sure to set these secrets in your Cloudflare Pages dashboard:');
console.log('1. JWT_SECRET');
console.log('2. NEXT_PUBLIC_GOOGLE_CLIENT_ID'); 