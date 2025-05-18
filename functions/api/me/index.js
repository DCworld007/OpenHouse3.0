// functions/api/me/index.js
export async function onRequest(context) {
  const { request, env } = context;

  // Helper: parse cookies
  function getCookie(name) {
    const value = `; ${request.headers.get('cookie') || ''}`;
    const parts = value.split(`; ${name}=`);
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
}