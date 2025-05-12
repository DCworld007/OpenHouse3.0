import { jwtVerify, SignJWT } from 'jose';
import { getJwtSecret, signToken } from '../../../src/utils/jwt';

export const onRequestPost = async (context: { request: Request, env: any }) => {
  const { request, env } = context;

  try {
    const { credential } = await request.json();
    if (!credential) {
      console.log('[login] No credential provided');
      return new Response(JSON.stringify({ error: 'Missing credential' }), { status: 400 });
    }

    console.log('[login] Verifying Google token...');
    // Verify Google ID token
    const response = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
    const payload = await response.json();
    console.log('[login] Google token response:', payload);
    
    if (!payload.email_verified) {
      console.log('[login] Email not verified');
      return new Response(JSON.stringify({ error: 'Email not verified' }), { status: 401 });
    }

    // Only include the fields you want in the JWT payload
    const jwtPayload = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    console.log('[login] Creating JWT with payload:', jwtPayload);

    const token = await signToken(jwtPayload, env);
    console.log('[login] Generated token:', token);

    // Set cookie and return response
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    });

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (e: any) {
    console.error('[login] Error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Login failed' }), { status: 401 });
  }
}; 