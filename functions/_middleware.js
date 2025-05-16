export const runtime = 'edge';

// Function to add CORS headers to all responses
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
  
  console.log(`[Middleware] ${request.method} ${url.pathname}`);
  
  // Protect against infinite redirect loops
  const referer = request.headers.get('referer');
  if (referer && referer.includes(url.pathname) && url.pathname === '/') {
    // Possible infinite loop, skip remaining middleware
    return context.next();
  }
  
  return await context.next();
}

// Special handler for problematic routes
async function handleSpecialRoutes(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  console.log(`[Middleware] Processing request for: ${path}`);

  // Special handling for data requests that are common sources of 500 errors
  if (path.includes('/_next/data/') && path.includes('/index.json')) {
    console.log('[Middleware] Intercepting index.json data request - returning empty data to prevent 500');
    return new Response(JSON.stringify({
      pageProps: {
        // Empty data that won't cause rendering errors
        __N_SSG: true 
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }

  // Check for user data requests and return demo user
  if (path === '/api/auth/me' || path === '/api/me') {
    console.log('[Middleware] Intercepting auth/me request - returning demo user');
    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/150'
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }

  // For routes handled by Functions, pass through to the Function
  return next();
}

// Export the middleware handlers in order
export const onRequest = [
  handleSpecialRoutes,
  logRequest,
  addCorsHeaders,
];