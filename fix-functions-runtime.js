const fs = require('fs');
const path = require('path');

// Function to recursively find all .js files in a directory
function findJsFiles(dir, fileList = []) {
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
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the file already has the Edge runtime directive
  if (content.includes('export const runtime = "edge"') || 
      content.includes("export const runtime = 'edge'")) {
    console.log(`✓ File already has Edge runtime: ${filePath}`);
    return;
  }
  
  // Add the Edge runtime directive at the beginning of the file
  const newContent = `export const runtime = 'edge';\n${content}`;
  fs.writeFileSync(filePath, newContent);
  console.log(`✅ Added Edge runtime to: ${filePath}`);
}

// Main function
function main() {
  const functionsDir = path.join(process.cwd(), 'functions');
  
  // Check if the functions directory exists
  if (!fs.existsSync(functionsDir)) {
    console.error('❌ The functions directory does not exist!');
    return;
  }
  
  // Find all .js files in the functions directory
  const jsFiles = findJsFiles(functionsDir);
  
  // Add Edge runtime directive to each file
  jsFiles.forEach(addEdgeRuntime);
  
  console.log(`\n🚀 Added Edge runtime to ${jsFiles.length} function files!`);
}

main(); 