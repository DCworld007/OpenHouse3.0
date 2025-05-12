// functions/api/auth/login/index.js
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
  
  try {
    // Get request body
    let credential;
    try {
      const requestBody = await request.json();
      credential = requestBody.credential;
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request body'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!credential) {
      return new Response(JSON.stringify({ error: 'Missing credential' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify Google ID token
    let payload;
    try {
      const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
      if (!response.ok) {
        return new Response(JSON.stringify({ 
          error: 'Failed to verify Google token'
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      payload = await response.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Error verifying Google token'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!payload.email_verified) {
      return new Response(JSON.stringify({ error: 'Email not verified' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a simplified session token
    // We'll just store the essential user information and encode it
    const sessionData = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    // Simple base64 encoding of the session data with a signature
    const sessionString = JSON.stringify(sessionData);
    const encodedSession = btoa(sessionString);
    
    // Create a simple signature using HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.JWT_SECRET || 'default_secret'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(encodedSession)
    );
    
    // Convert signature to base64
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    // Final token format: encodedSession.signature
    const token = `${encodedSession}.${base64Signature}`;

    // Set cookie and return response
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    });

    return new Response(JSON.stringify({ 
      ok: true,
      user: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    }), { 
      status: 200,
      headers: responseHeaders 
    });
  } catch (e) {
    console.error('[API Login] Unhandled error:', e);
    return new Response(JSON.stringify({ 
      error: 'Login failed'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}