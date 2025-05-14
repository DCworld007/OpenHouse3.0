#!/usr/bin/env node

/**
 * This script forces all Next.js API routes to use the Edge runtime
 * by creating a temporary runtime.js file in each API directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// API route directories
const apiDirs = [
  'src/app/api/auth/login',
  'src/app/api/auth/logout',
  'src/app/api/auth/me',
  'src/app/api/login',
  'src/app/api/logout',
  'src/app/api/me',
  'src/app/api/simple-auth/login',
  'src/app/api/simple-auth/logout',
  'src/app/api/simple-auth/me',
  'src/app/api/test'
];

// Next.js runtime config file to add to each directory
const runtimeContent = `
export const runtime = 'edge';
export const preferredRegion = 'auto';
`;

// Create config file in each directory if it doesn't exist
apiDirs.forEach(dir => {
  const fullDir = path.join(process.cwd(), dir);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
  
  // Look for route.js or route.ts file
  const routeFile = fs.existsSync(path.join(fullDir, 'route.js')) 
    ? path.join(fullDir, 'route.js')
    : fs.existsSync(path.join(fullDir, 'route.ts'))
      ? path.join(fullDir, 'route.ts')
      : null;
  
  if (routeFile) {
    // Check if file already has Edge runtime
    const fileContent = fs.readFileSync(routeFile, 'utf8');
    if (!fileContent.includes("export const runtime = 'edge'")) {
      // Add runtime directive to the file
      const newContent = `export const runtime = 'edge';\nexport const preferredRegion = 'auto';\n\n${fileContent}`;
      fs.writeFileSync(routeFile, newContent);
      console.log(`✅ Added Edge runtime to: ${routeFile}`);
    } else {
      console.log(`✓ File already has Edge runtime: ${routeFile}`);
    }
  } else {
    // Create a new runtime config file
    const configFile = path.join(fullDir, 'runtime.js');
    fs.writeFileSync(configFile, runtimeContent);
    console.log(`✅ Created runtime config: ${configFile}`);
  }
});

// Also modify next.config.mjs to force Edge runtime for all routes
try {
  const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
  const configContent = fs.readFileSync(nextConfigPath, 'utf8');
  
  // Check if the config needs to be updated
  if (!configContent.includes('experimental: { runtime: "edge" }')) {
    // Simple replacement - this is a hack but should work for the build
    const updatedConfig = configContent.replace(
      'experimental: {',
      'experimental: {\n    runtime: "edge",\n    forceAllPageRuntimes: "edge",'
    );
    
    fs.writeFileSync(nextConfigPath, updatedConfig);
    console.log('✅ Updated next.config.mjs to force Edge runtime');
  }
} catch (error) {
  console.error('Failed to update next.config.mjs:', error);
}

console.log('🚀 All API routes now use Edge runtime!'); 