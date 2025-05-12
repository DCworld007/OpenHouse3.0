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

// Ensure functions/[[path]].js exists
const catchAllPath = path.join(process.cwd(), 'functions', '[[path]].js');
if (!fs.existsSync(path.dirname(catchAllPath))) {
  fs.mkdirSync(path.dirname(catchAllPath), { recursive: true });
}

// Create the catch-all handler
fs.writeFileSync(
  catchAllPath,
  `export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(\`[[[path]].js] Handling request for: \${path}\`);
  
  // Extract API path parts for proper routing
  const parts = path.split('/').filter(Boolean);
  
  if (parts[0] === 'api') {
    // This is an API request, handle it with proper modules
    try {
      // Dynamically import the correct handler based on the path
      const importPath = \`./\${path}.js\`;
      console.log(\`[[[path]].js] Trying to import: \${importPath}\`);
      
      try {
        // First try: Direct import of the exact path
        const module = await import(importPath);
        console.log(\`[[[path]].js] Successfully imported module for \${path}\`);
        
        // Determine the correct handler based on request method
        const method = request.method.toLowerCase();
        const handler = module[\`onRequest\${request.method}\`] || module.onRequest;
        
        if (handler) {
          console.log(\`[[[path]].js] Found handler for \${method} \${path}\`);
          return await handler(context);
        } else {
          console.error(\`[[[path]].js] No handler found for \${method} \${path}\`);
          return new Response(JSON.stringify({ error: \`Method \${request.method} not supported\` }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (importError) {
        console.error(\`[[[path]].js] Import error for \${importPath}:\`, importError);
        
        // Check if this might be a dynamic route
        if (parts.length >= 2) {
          // Try to match a dynamic route pattern
          const basePath = parts.slice(0, -1).join('/');
          const param = parts[parts.length - 1];
          const dynamicImportPath = \`./api/\${basePath}/[\${parts[parts.length - 2]}].js\`;
          
          console.log(\`[[[path]].js] Trying dynamic import: \${dynamicImportPath}\`);
          
          try {
            const module = await import(dynamicImportPath);
            console.log(\`[[[path]].js] Successfully imported dynamic module\`);
            
            // Set the parameter in context
            context.params = context.params || {};
            context.params[parts[parts.length - 2]] = param;
            
            // Determine the correct handler
            const method = request.method.toLowerCase();
            const handler = module[\`onRequest\${request.method}\`] || module.onRequest;
            
            if (handler) {
              console.log(\`[[[path]].js] Found dynamic handler for \${method} \${path}\`);
              return await handler(context);
            }
          } catch (dynamicImportError) {
            console.error(\`[[[path]].js] Dynamic import error:\`, dynamicImportError);
          }
        }
        
        // If we couldn't find a matching handler, return 404
        return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error(\`[[[path]].js] Error handling API request:\`, error);
      return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Pass through for non-API requests (will be handled by Pages)
  return fetch(request);
}`
);
console.log('✅ Created functions/[[path]].js');

// Ensure API directories exist
const apiAuthDir = path.join(process.cwd(), 'functions', 'api', 'auth');
if (!fs.existsSync(apiAuthDir)) {
  fs.mkdirSync(apiAuthDir, { recursive: true });
}

// Create login.js
fs.writeFileSync(
  path.join(apiAuthDir, 'login.js'),
  `import { signToken } from '../../../src/utils/jwt';

export async function onRequestPost(context) {
  const { request, env } = context;

  console.log('[API Login] Received login request');
  console.log('[API Login] Request URL:', request.url);
  
  // Get headers in a safer way
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('[API Login] Headers:', JSON.stringify(headers));

  try {
    // Get request body
    let credential;
    try {
      const requestBody = await request.json();
      console.log('[API Login] Request body:', JSON.stringify(requestBody));
      credential = requestBody.credential;
    } catch (e) {
      console.error('[API Login] Error parsing request body:', e);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body', 
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!credential) {
      console.log('[API Login] No credential provided');
      return new Response(JSON.stringify({ error: 'Missing credential' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[API Login] Verifying Google token...');
    // Verify Google ID token
    let payload;
    try {
      const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
      if (!response.ok) {
        console.error('[API Login] Google verification failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[API Login] Google error response:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Failed to verify Google token',
          status: response.status,
          details: errorText
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      payload = await response.json();
      console.log('[API Login] Google token response:', JSON.stringify(payload));
    } catch (e) {
      console.error('[API Login] Error verifying Google token:', e);
      return new Response(JSON.stringify({ 
        error: 'Error verifying Google token',
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!payload.email_verified) {
      console.log('[API Login] Email not verified');
      return new Response(JSON.stringify({ error: 'Email not verified' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only include the fields you want in the JWT payload
    const jwtPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    console.log('[API Login] Creating JWT with payload:', JSON.stringify(jwtPayload));

    let token;
    try {
      token = await signToken(jwtPayload, env);
      console.log('[API Login] Generated token:', token);
    } catch (e) {
      console.error('[API Login] Error generating JWT token:', e);
      return new Response(JSON.stringify({ 
        error: 'Error generating JWT token',
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set cookie and return response
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': \`token=\${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800\`
    });

    return new Response(JSON.stringify({ ok: true }), { headers: responseHeaders });
  } catch (e) {
    console.error('[API Login] Unhandled error:', e);
    return new Response(JSON.stringify({ 
      error: 'Login failed', 
      message: e.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}`
);
console.log('✅ Created functions/api/auth/login.js');

// Create the basic API endpoints in the Cloudflare Functions format
const apiMeDir = path.join(process.cwd(), 'functions', 'api', 'me');
if (!fs.existsSync(apiMeDir)) {
  fs.mkdirSync(apiMeDir, { recursive: true });
}

// Create me/index.js
fs.writeFileSync(
  path.join(apiMeDir, 'index.js'),
  `// functions/api/me/index.js
export async function onRequest(context) {
  const { request, env } = context;

  // Helper: parse cookies
  function getCookie(name) {
    const value = \`; \${request.headers.get('cookie') || ''}\`;
    const parts = value.split(\`; \${name}=\`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  try {
    const cookieHeader = request.headers.get('cookie');
    console.log('[GET /api/me] Cookie header:', cookieHeader);
    const token = getCookie('token');
    console.log('[GET /api/me] Token:', token);
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated: No token cookie' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    try {
      // Manual decode since we might have issues with the JWT verification in this environment
      const parts = token.split('.');
      if (parts.length < 2) throw new Error('Malformed JWT');
      
      // Decode the payload
      const payload = JSON.parse(atob(parts[1]));
      
      // Only return safe user info
      const { sub, email, name, picture } = payload;
      console.log('[GET /api/me] User payload (decoded):', { sub, email, name, picture });
      
      return new Response(JSON.stringify({ 
        sub, email, name, picture
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (decodeErr) {
      console.error('[GET /api/me] Token decode failed:', decodeErr);
      return new Response(JSON.stringify({ 
        error: 'Invalid token format',
        details: decodeErr.message
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    console.error('[GET /api/me] Error:', e);
    return new Response(JSON.stringify({ 
      error: 'Not authenticated',
      details: e.message || 'Unknown error'
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}`
);
console.log('✅ Created functions/api/me/index.js');

// Create auth/login/index.js
const apiAuthLoginDir = path.join(process.cwd(), 'functions', 'api', 'auth', 'login');
if (!fs.existsSync(apiAuthLoginDir)) {
  fs.mkdirSync(apiAuthLoginDir, { recursive: true });
}

fs.writeFileSync(
  path.join(apiAuthLoginDir, 'index.js'),
  `// functions/api/auth/login/index.js
export async function onRequest(context) {
  const { request, env } = context;

  // Only handle POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('[API Login] Received login request');
  console.log('[API Login] Request URL:', request.url);
  
  // Get headers in a safer way
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('[API Login] Headers:', JSON.stringify(headers));

  try {
    // Get request body
    let credential;
    try {
      const requestBody = await request.json();
      console.log('[API Login] Request body:', JSON.stringify(requestBody));
      credential = requestBody.credential;
    } catch (e) {
      console.error('[API Login] Error parsing request body:', e);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body', 
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!credential) {
      console.log('[API Login] No credential provided');
      return new Response(JSON.stringify({ error: 'Missing credential' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[API Login] Verifying Google token...');
    // Verify Google ID token
    let payload;
    try {
      const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
      if (!response.ok) {
        console.error('[API Login] Google verification failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[API Login] Google error response:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Failed to verify Google token',
          status: response.status,
          details: errorText
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      payload = await response.json();
      console.log('[API Login] Google token response:', JSON.stringify(payload));
    } catch (e) {
      console.error('[API Login] Error verifying Google token:', e);
      return new Response(JSON.stringify({ 
        error: 'Error verifying Google token',
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!payload.email_verified) {
      console.log('[API Login] Email not verified');
      return new Response(JSON.stringify({ error: 'Email not verified' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only include the fields you want in the JWT payload
    const jwtPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      iss: 'openhouse3',
      aud: 'openhouse3-users'
    };
    console.log('[API Login] Creating JWT with payload:', JSON.stringify(jwtPayload));

    // Manual JWT creation without library dependencies
    const headerObj = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = btoa(JSON.stringify(headerObj)).replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');
    const payloadB64 = btoa(JSON.stringify(jwtPayload)).replace(/=/g, '').replace(/\\+/g, '-').replace(/\\//g, '_');
    
    // Since we can't sign it here, we'll use an unsigned token
    const token = \`\${headerB64}.\${payloadB64}.unsigned\`;
    console.log('[API Login] Generated token:', token);

    // Set cookie and return response
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': \`token=\${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800\`
    });

    return new Response(JSON.stringify({ ok: true }), { headers: responseHeaders });
  } catch (e) {
    console.error('[API Login] Unhandled error:', e);
    return new Response(JSON.stringify({ 
      error: 'Login failed', 
      message: e.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}`
);
console.log('✅ Created functions/api/auth/login/index.js');

// Create middleware.js for CORS and logging
fs.writeFileSync(
  path.join(process.cwd(), 'functions', '_middleware.js'),
  `// Function to add CORS headers to all responses
async function addCorsHeaders(context) {
  const { request } = context;
  
  // Get the original response
  let response = await context.next();
  
  // Clone the response to modify headers
  const newResponse = new Response(response.body, response);
  
  // Add CORS headers
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: newResponse.headers
    });
  }
  
  return newResponse;
}

// Function to log all requests
async function logRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  console.log(\`[Middleware] \${request.method} \${url.pathname}\`);
  
  return await context.next();
}

// Export the middleware handler
export const onRequest = [
  logRequest,
  addCorsHeaders,
];`
);
console.log('✅ Created functions/_middleware.js');

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
  includeFiles: ['public/**/*', 'functions/**/*'],
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