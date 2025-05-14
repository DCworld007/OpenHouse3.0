#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * This script prepares the application for Cloudflare Pages deployment
 */

// Ensure functions directory exists
const functionsDir = path.join(process.cwd(), 'functions');
if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
}

// Create _routes.json file
const routesContent = JSON.stringify({
  version: 1,
  include: ["/*"],
  exclude: []
}, null, 2);
fs.writeFileSync(path.join(functionsDir, '_routes.json'), routesContent);
console.log('✅ Created functions/_routes.json');

// Create [[path]].js catch-all route
const catchAllContent = `export function onRequest(context) {
  // Forward the request to the origin  
  return context.env.ASSETS.fetch(context.request);
}`;
fs.writeFileSync(path.join(functionsDir, '[[path]].js'), catchAllContent);
console.log('✅ Created functions/[[path]].js');

// Create API directories and files
// Login Function
const loginDir = path.join(functionsDir, 'api', 'auth', 'login');
fs.mkdirSync(loginDir, { recursive: true });
fs.writeFileSync(path.join(loginDir, 'index.js'), 
`export const runtime = 'edge';
export * from '../../../src/app/api/auth/login/route';`);
console.log('✅ Created functions/api/auth/login.js');

// Me Function
const meDir = path.join(functionsDir, 'api/me');
fs.mkdirSync(meDir, { recursive: true });
fs.writeFileSync(path.join(meDir, 'index.js'), 
`export const runtime = 'edge';
export * from '../../../src/app/api/me/route';`);
console.log('✅ Created functions/api/me/index.js');

// Login Alt Function
fs.writeFileSync(path.join(functionsDir, 'api/auth/login/index.js'), 
`export const runtime = 'edge';
export * from '../../../../src/app/api/auth/login/route';`);
console.log('✅ Created functions/api/auth/login/index.js');

// Middleware
const middlewareContent = `export const runtime = 'edge';
export * from '../src/middleware';`;
fs.writeFileSync(path.join(functionsDir, '_middleware.js'), middlewareContent);
console.log('✅ Created functions/_middleware.js');

// Create _redirects file
const redirectsDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(redirectsDir)) {
  fs.mkdirSync(redirectsDir, { recursive: true });
}
fs.writeFileSync(path.join(redirectsDir, '_redirects'), '/* /_worker.js 200');
console.log('✅ Created public/_redirects');

// Create .node-version file
fs.writeFileSync(path.join(process.cwd(), '.node-version'), '18.20.8');
console.log('✅ Created .node-version');

// Create Cloudflare Pages.js
const pagesDir = path.join(process.cwd(), '.cloudflare');
if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}
fs.writeFileSync(path.join(pagesDir, 'pages.js'), `
const Edge = {
  // Required to use Edge Runtime
  edge: true,
  // Specifies which Edge Runtime build to use
  nodeCompat: false
};

export const config = {
  runtime: 'edge'
};

export default Edge;
`);
console.log('✅ Created .cloudflare/pages.js');

// Update next.config.mjs to add edge runtime
try {
  const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    
    if (nextConfig.includes('experimental: { runtime: "edge"')) {
      console.log('✅ next.config.mjs already has edge runtime configuration');
    } else {
      const updatedConfig = nextConfig.replace(
        'experimental: {',
        'experimental: {\n    runtime: "edge",\n    forceAllPageRuntimes: "edge",'
      );
      fs.writeFileSync(nextConfigPath, updatedConfig);
      console.log('✅ Updated next.config.mjs to add edge runtime configuration');
    }
  }
} catch (error) {
  console.error('Error updating next.config.mjs:', error);
}

console.log('\n🚀 Application prepared for Cloudflare Pages deployment!');
console.log('\nMake sure to set these secrets in your Cloudflare Pages dashboard:');
console.log('1. JWT_SECRET');
console.log('2. NEXT_PUBLIC_GOOGLE_CLIENT_ID');

// Function to add Edge runtime to all function files in the post-build step
function addEdgeRuntimeToFunctionFiles() {
  console.log('\n🔍 Checking for function files that need Edge runtime...');
  
  // Function to recursively find all .js files in a directory
  function findJsFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findJsFiles(filePath, fileList);
      } else if (file.endsWith('.js')) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  }

  // Function to add Edge runtime directive to a file if it doesn't already have it
  function addEdgeRuntime(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check if the file already has the Edge runtime directive
      if (content.includes('export const runtime = "edge"') || 
          content.includes("export const runtime = 'edge'")) {
        return false; // Already has Edge runtime
      }
      
      // Add the Edge runtime directive at the beginning of the file
      const newContent = `export const runtime = 'edge';\n${content}`;
      fs.writeFileSync(filePath, newContent);
      return true; // Added Edge runtime
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      return false;
    }
  }
  
  // Find all .js files in the functions directory
  const functionsDir = path.join(process.cwd(), 'functions');
  if (!fs.existsSync(functionsDir)) {
    console.log('❌ Functions directory does not exist yet (this is normal during initial setup)');
    return;
  }
  
  const jsFiles = findJsFiles(functionsDir);
  let modifiedCount = 0;
  
  // Add Edge runtime directive to each file
  jsFiles.forEach(file => {
    if (addEdgeRuntime(file)) {
      modifiedCount++;
    }
  });
  
  if (modifiedCount > 0) {
    console.log(`✅ Added Edge runtime to ${modifiedCount} function files`);
  } else {
    console.log('✓ All function files already have Edge runtime');
  }
}

// This will be called during the post-build process
addEdgeRuntimeToFunctionFiles(); 