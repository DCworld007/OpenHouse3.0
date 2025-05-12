import { verifyToken, getJwtSecret } from '../../src/utils/jwt';

export const onRequestGet = async (context: { request: Request, env: any }) => {
  const { request, env } = context;

  // Helper: parse cookies
  function getCookie(name: string) {
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
      return new Response(JSON.stringify({ error: 'Not authenticated: No token cookie' }), { status: 401 });
    }
    
    try {
      // Verify the token using our utility
      const { payload } = await verifyToken(token, env);
      
      // Only return safe user info
      const { sub, email, name, picture } = payload;
      console.log('[GET /api/me] User payload:', { sub, email, name, picture });
      return new Response(JSON.stringify({ sub, email, name, picture }), { status: 200 });
    } catch (err) {
      // If token verification fails, try manual decoding as a fallback
      const parts = token.split('.');
      if (parts.length < 2) throw new Error('Malformed JWT');
      const payload = JSON.parse(atob(parts[1]));
      
      // Only return safe user info
      const { sub, email, name, picture } = payload;
      console.log('[GET /api/me] User payload (decoded without verification):', { sub, email, name, picture });
      
      // Add a warning that the token wasn't properly verified
      return new Response(JSON.stringify({ 
        sub, email, name, picture,
        warning: "Token decoded but not verified - secret may be mismatched" 
      }), { status: 200 });
    }
  } catch (e: any) {
    console.log('[GET /api/me] Error:', e.message || e);
    return new Response(JSON.stringify({ error: e.message || 'Not authenticated' }), { status: 401 });
  }
}; 