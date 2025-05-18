const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const API_DIR = path.join(__dirname, '../src/app/api');

async function findApiRoutes(dir) {
  const result = [];
  const entries = await readdir(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      const nestedRoutes = await findApiRoutes(fullPath);
      result.push(...nestedRoutes);
    } else if (entry === 'route.js' || entry === 'route.ts') {
      result.push(fullPath);
    }
  }
  
  return result;
}

async function addEdgeRuntimeToFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  
  // Check if file already has runtime declaration
  if (content.includes("export const runtime = 'edge'")) {
    console.log(`✓ ${filePath} already has edge runtime`);
    return;
  }
  
  // Add runtime directive after imports or at the beginning of the file
  let newContent;
  if (content.includes('import')) {
    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex !== -1) {
      lines.splice(lastImportIndex + 1, 0, '', "export const runtime = 'edge';");
      newContent = lines.join('\n');
    }
  }
  
  // If no imports found or couldn't insert after imports, add at the beginning
  if (!newContent) {
    newContent = `export const runtime = 'edge';\n\n${content}`;
  }
  
  await writeFile(filePath, newContent, 'utf8');
  console.log(`✅ Added edge runtime to ${filePath}`);
}

async function main() {
  try {
    console.log('Finding API routes...');
    const apiRoutes = await findApiRoutes(API_DIR);
    console.log(`Found ${apiRoutes.length} API routes`);
    
    for (const route of apiRoutes) {
      await addEdgeRuntimeToFile(route);
    }
    
    console.log('Done! All API routes now have edge runtime directive.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 