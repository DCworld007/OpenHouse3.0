import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret, signToken } from '../../../src/utils/jwt';

export const onRequestPost = async (context: { request: Request, env: any }) => {
  const { request, env } = context;

  console.log('[API Login] Received login request');
  console.log('[API Login] Request URL:', request.url);
  
  // Get headers in a safer way
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('[API Login] Headers:', JSON.stringify(headers));

  try {
    // Get request body
    let credential;
    try {
      const requestBody = await request.json();
      console.log('[API Login] Request body:', JSON.stringify(requestBody));
      credential = requestBody.credential;
    } catch (e) {
      console.error('[API Login] Error parsing request body:', e);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body', 
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    
    // Only include the fields you want in the JWT payload
    const jwtPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    console.log('[API Login] Creating JWT with payload:', JSON.stringify(jwtPayload));

    let token;
    try {
      token = await signToken(jwtPayload, env);
      console.log('[API Login] Generated token:', token);
    } catch (e) {
      console.error('[API Login] Error generating JWT token:', e);
      return new Response(JSON.stringify({ 
        error: 'Error generating JWT token',
        details: e instanceof Error ? e.message : String(e)
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set cookie and return response
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    });

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (e: any) {
    console.error('[API Login] Unhandled error:', e);
    return new Response(JSON.stringify({ 
      error: 'Login failed', 
      message: e.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 