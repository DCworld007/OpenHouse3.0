import { jwtVerify } from 'jose';

export async function onRequest(context) {
  const { request, env } = context;

  try {
    // Get the token from the cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ')
        .filter(Boolean)
        .map(pair => pair.split('=').map(decodeURIComponent))
    );
    
    const token = cookies.token;
    
    // If no token is found, return unauthorized
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'Not authenticated',
        message: 'No token found in cookies' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create a TextEncoder to convert JWT_SECRET to Uint8Array
    const encoder = new TextEncoder();
    // The secret should be passed in env or use a default for development
    const secret = env.JWT_SECRET || 'Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz';
    
    try {
      // Verify the token
      const { payload } = await jwtVerify(
        token,
        encoder.encode(secret)
      );
      
      // Return user info
      return new Response(JSON.stringify({
        authenticated: true,
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (verifyError) {
      // Token is invalid
      return new Response(JSON.stringify({ 
        error: 'Invalid token',
        message: verifyError.message 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('[API Me] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      message: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}