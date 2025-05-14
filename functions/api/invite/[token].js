// Invite token validation endpoint
export async function onRequest(context) {
  const { request, env, params } = context;
  console.log('[invite/token.js] Received request:', request.method, params);
  
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers
    });
  }
  
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ 
      error: `Method ${request.method} not supported` 
    }), { 
      status: 405,
      headers
    });
  }
  
  try {
    return await onRequestGet(context, headers);
  } catch (error) {
    console.error('[invite/token.js] Error handling request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
}

export async function onRequestGet(context, responseHeaders) {
  const { request, env, params } = context;
  const { token } = params;
  
  // Use headers passed from the main handler
  const headers = responseHeaders || { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  if (!token) {
    return new Response(JSON.stringify({ 
      error: 'Missing invite token' 
    }), { 
      status: 400,
      headers
    });
  }
  
  // Set base URL for redirects
  const baseUrl = env.NEXTAUTH_URL || env.VERCEL_URL || 'http://localhost:3000';
  
  try {
    // In a production environment, this would verify the token against a database
    // For our development environment, we'll simulate token validation with basic checks
    
    // We'll consider tokens valid if they're alphanumeric and at least 32 characters
    const isValidToken = /^[a-zA-Z0-9]{32,}$/.test(token);
    
    if (!isValidToken) {
      console.log(`[invite/token.js] Invalid token format: ${token}`);
      return Response.redirect(new URL('/invite-invalid?error=invalid_format', baseUrl), 302);
    }
    
    // For development, assume all properly formatted tokens are valid and active
    // (In production, you would check against DB records)
    console.log(`[invite/token.js] Valid token: ${token}`);
    
    // Token is valid, redirect to join confirmation page
    const joinUrl = new URL('/join', baseUrl);
    joinUrl.searchParams.set('token', token);
    return Response.redirect(joinUrl.toString(), 302);
    
  } catch (error) {
    console.error('[invite/token.js] Error validating invite token:', error);
    return Response.redirect(new URL('/invite-invalid?error=server_error', baseUrl), 302);
  }
} 