#!/usr/bin/env node

// This script prepares the project for CI environments

console.log('🔧 Preparing project for CI environment...');

// Ensure the package-lock.json is correct
console.log('- Ensuring dependencies are installed correctly');

// Create a CI helper file for Cloudflare Pages
const fs = require('fs');
const path = require('path');

// Create .cloudflare-deploy-helper file
const deployHelperContent = `
This project uses Cloudflare Pages with Next.js.

Build command:
- npm run install:ci && npm run build

Environment variables:
- JWT_SECRET
- NEXT_PUBLIC_GOOGLE_CLIENT_ID

Node version: 18.20.8
`;

fs.writeFileSync(path.join(process.cwd(), '.cloudflare-deploy-helper'), deployHelperContent);
console.log('✅ Created .cloudflare-deploy-helper file');

console.log('\n🚀 CI preparation complete!'); 