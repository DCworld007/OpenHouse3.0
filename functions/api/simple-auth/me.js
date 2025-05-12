// Simplified me endpoint for Cloudflare Functions
export async function onRequestGet(context) {
  const { request, env } = context;

  // Helper: parse cookies
  function getCookie(name) {
    const value = `; ${request.headers.get('cookie') || ''}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  try {
    const token = getCookie('token');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify session token
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        throw new Error('Invalid token format');
      }
      
      const [encodedSession, receivedSignature] = parts;
      
      // Verify signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(env.JWT_SECRET || 'default_secret'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      // Convert received signature from base64 to ArrayBuffer
      const signatureBytes = atob(receivedSignature);
      const signatureArray = new Uint8Array(signatureBytes.length);
      for (let i = 0; i < signatureBytes.length; i++) {
        signatureArray[i] = signatureBytes.charCodeAt(i);
      }
      
      // Verify signature
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureArray,
        encoder.encode(encodedSession)
      );
      
      if (!isValid) {
        throw new Error('Invalid signature');
      }
      
      // Decode session data
      const sessionString = atob(encodedSession);
      const userData = JSON.parse(sessionString);
      
      // Check expiration
      if (userData.exp && userData.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Session expired');
      }
      
      // Return user info
      return new Response(JSON.stringify({ 
        sub: userData.sub,
        email: userData.email,
        name: userData.name,
        picture: userData.picture
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ 
        error: 'Invalid session',
        details: err.message
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ 
      error: 'Authentication error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 