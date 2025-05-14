// Pure vanilla JS - no imports
export function onRequest(context) {
  const { request } = context;
  
  // Get cookies
  let token = null;
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
    if (tokenCookie) {
      token = tokenCookie.split('=')[1].trim();
    }
  }
  
  if (!token) {
    return new Response(JSON.stringify({ 
      authenticated: false,
      message: 'Not authenticated'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Parse the token (simple parsing, not verifying)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    // Base64 decode payload
    const decodedPayload = atob(parts[1]);
    const payload = JSON.parse(decodedPayload);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return new Response(JSON.stringify({ 
        authenticated: false, 
        message: 'Token expired'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return the user info
    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      authenticated: false,
      message: error.message || 'Invalid token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 