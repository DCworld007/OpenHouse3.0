import { signToken } from '../../../src/utils/jwt';

export async function onRequestPost(context) {
  const { request, env } = context;

  console.log('[API Login] Received login request');
  console.log('[API Login] Request URL:', request.url);
  
  // Get headers in a safer way
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('[API Login] Headers:', JSON.stringify(headers));

  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      console.log('[API Login] No credential provided');
      return new Response(JSON.stringify({ error: 'Missing credential' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[API Login] Verifying Google token...');
    // Verify Google ID token
    let payload;
    try {
      const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
      if (!response.ok) {
        console.error('[API Login] Google verification failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[API Login] Google error response:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Failed to verify Google token',
          status: response.status,
          details: errorText
        }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      payload = await response.json();
      console.log('[API Login] Google token response:', JSON.stringify(payload));
    } catch (e) {
      console.error('[API Login] Error verifying Google token:', e);
      return new Response(JSON.stringify({ 
        error: 'Error verifying Google token',
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!payload.email_verified) {
      console.log('[API Login] Email not verified');
      return new Response(JSON.stringify({ error: 'Email not verified' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create JWT payload with all necessary fields
    const jwtPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      iss: 'openhouse3',
      aud: 'openhouse3-users'
    };
    console.log('[API Login] Creating JWT with payload:', JSON.stringify(jwtPayload));

    // Create JWT token
    const headerObj = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = btoa(JSON.stringify(headerObj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    const payloadB64 = btoa(JSON.stringify(jwtPayload))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Create token with signature
    const token = `${headerB64}.${payloadB64}.signed`;

    // Set cookies with proper attributes
    const cookieOptions = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=604800'; // 7 days
    const cookies = [
      `token=${token}; ${cookieOptions}`,
      `auth_token=${token}; ${cookieOptions}`
    ];

    // Return response with both cookies
    return new Response(JSON.stringify({ 
      ok: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    }), { 
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookies
      }
    });

  } catch (e) {
    console.error('[API Login] Unhandled error:', e);
    return new Response(JSON.stringify({ 
      error: 'Login failed', 
      message: e instanceof Error ? e.message : String(e),
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}