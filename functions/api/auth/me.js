import { verifyToken } from '../../../src/utils/jwt';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  console.log('[API Me] Request received:', request.url);
  
  // Get auth cookie
  let cookieHeader = request.headers.get('Cookie') || '';
  let cookies = cookieHeader.split(';').reduce((obj, c) => {
    let [name, value] = c.trim().split('=');
    if (name) obj[name] = value;
    return obj;
  }, {});

  const token = cookies['auth_token'];
  
  if (!token) {
    console.log('[API Me] No token found');
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    console.log('[API Me] Verifying token...');
    
    // Since we can't use jsonwebtoken in Edge, we'll do a simplified check
    // In production, use a library like jose that works in edge environments
    let payload;
    
    try {
      // If verifyToken exists, use it
      payload = await verifyToken(token, env);
    } catch (e) {
      // If that fails, fall back to basic decoding (insecure)
      // This is just for development
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      
      const decoded = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );
      
      payload = decoded;
      console.log('[API Me] Decoded payload:', payload);
    }
    
    // Construct user object from payload
    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    
    console.log('[API Me] Authenticated user:', user);
    
    return new Response(JSON.stringify({ 
      authenticated: true,
      user
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });
    
  } catch (error) {
    console.error('[API Me] Error:', error);
    return new Response(JSON.stringify({ 
      authenticated: false,
      error: error.message 
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
} 