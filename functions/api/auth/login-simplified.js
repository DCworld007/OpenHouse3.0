import { SignJWT } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;

  console.log('[API Login] Received login request');
  
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
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

    // JWT payload
    const jwtPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    // Sign JWT token
    const encoder = new TextEncoder();
    const secret = env.JWT_SECRET || 'Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz';
    
    const token = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(encoder.encode(secret));

    // Set cookie and return response
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    });

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    }), { 
      headers 
    });
  } catch (e) {
    console.error('[API Login] Error:', e);
    return new Response(JSON.stringify({ 
      error: 'Login failed',
      message: e.message || 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 