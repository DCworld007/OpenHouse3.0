#!/usr/bin/env node

const jose = require('jose');

async function createTestToken() {
  // Create a test user token
  // Get the secret from environment or use a placeholder
  const secretValue = process.env.JWT_SECRET || "REPLACE_WITH_YOUR_JWT_SECRET"; 
  
  if (secretValue === "REPLACE_WITH_YOUR_JWT_SECRET") {
    console.error("ERROR: You must set the JWT_SECRET environment variable before running this script.");
    console.error("For example: JWT_SECRET=your-secure-secret node simulate-login.js");
    process.exit(1);
  }
  
  const secret = new TextEncoder().encode(secretValue);
  
  const token = await new jose.SignJWT({ 
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  
  console.log('Token created:', token);
  console.log('\nTo test the application:');
  console.log('1. Start your app with: npm run dev');
  console.log('2. Open your browser to: http://localhost:3000');
  console.log('3. Open browser developer tools');
  console.log('4. In the console, paste the following:');
  console.log(`\ndocument.cookie = "token=${token}; path=/; max-age=86400"\n`);
  console.log('5. Refresh the page, and you should be logged in as the test user');
}

createTestToken().catch(console.error); 