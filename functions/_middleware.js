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
  
  return await context.next();
}

// Export the middleware handler
export const onRequest = [
  logRequest,
  addCorsHeaders,
];