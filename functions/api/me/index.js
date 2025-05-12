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
    
    // Verify JWT token
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const [headerB64, payloadB64, signatureB64] = parts;
      
      // Decode header and payload
      const header = JSON.parse(atob(headerB64));
      const payload = JSON.parse(atob(payloadB64));
      
      // Verify token hasn't expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }
      
      // Verify signature
      const encoder = new TextEncoder();
      const data = encoder.encode(`${headerB64}.${payloadB64}`);
      const secretKeyData = encoder.encode(env.JWT_SECRET || 'fallback_secret_do_not_use_in_production');
      
      // Import key for verification
      const key = await crypto.subtle.importKey(
        'raw',
        secretKeyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      // Convert signature from base64 to ArrayBuffer
      const signatureUrl = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - signatureUrl.length % 4) % 4);
      const signatureBase64 = signatureUrl + padding;
      const signatureBytes = atob(signatureBase64);
      const signatureArray = new Uint8Array(signatureBytes.length);
      for (let i = 0; i < signatureBytes.length; i++) {
        signatureArray[i] = signatureBytes.charCodeAt(i);
      }
      
      // Verify signature
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureArray,
        data
      );
      
      if (!isValid) {
        throw new Error('Invalid signature');
      }
      
      // Only return safe user info
      const { sub, email, name, picture } = payload;
      console.log('[GET /api/me] User payload (verified):', { sub, email, name, picture });
      
      return new Response(JSON.stringify({ 
        sub, email, name, picture
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (verifyErr) {
      console.error('[GET /api/me] Token verification failed:', verifyErr);
      return new Response(JSON.stringify({ 
        error: 'Invalid token',
        details: verifyErr.message
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