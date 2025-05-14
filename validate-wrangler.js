const fs = require('fs');
const toml = require('@iarna/toml');

try {
  const content = fs.readFileSync('wrangler.toml', 'utf8');
  const parsed = toml.parse(content);
  console.log('✅ TOML file is valid!');
  console.log('Parsed content:', JSON.stringify(parsed, null, 2));
} catch (error) {
  console.error('❌ TOML file is invalid!');
  console.error('Error:', error.message);
  if (error.line && error.col) {
    console.error(`Location: Line ${error.line}, Column ${error.col}`);
    // Extract the relevant line from the file
    const lines = fs.readFileSync('wrangler.toml', 'utf8').split('\n');
    if (lines.length >= error.line) {
      console.error('Problematic line:', lines[error.line - 1]);
      console.error(' '.repeat(error.col - 1) + '^');
    }
  }
} 