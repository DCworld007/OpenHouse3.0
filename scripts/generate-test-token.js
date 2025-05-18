// Script to generate test tokens for development
const jose = require('jose');

// This must match the JWT_SECRET in your environment
const JWT_SECRET = "X7d4KjP9Rt6vQ8sFbZ2mEwHc5LnAaYpG3xNzVuJq";

async function generateToken() {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const payload = {
    sub: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    // Set issues at to a fixed time so generated tokens are consistent
    iat: Math.floor(new Date('2023-12-01').getTime() / 1000),
    // These are fields expected by your middleware
    iss: "openhouse3",
    aud: "openhouse3-users",
    // Set a far future expiration (2032)
    exp: Math.floor(new Date('2032-01-01').getTime() / 1000)
  };

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  console.log('Generated test token:');
  console.log(token);
  console.log('\nToken payload:');
  console.log(JSON.stringify(payload, null, 2));
}

generateToken().catch(console.error); 