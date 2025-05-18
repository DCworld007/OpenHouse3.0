import { jwtVerify } from 'jose';

export const runtime = 'edge';

// Generate a secret key - in production, this should be an environment variable
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long-here!!!!'
);

export async function GET(request) {
  try {
    // Get cookies
    let token = null;
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1].trim();
      }
    }
    
    if (!token) {
      return Response.json({ 
        authenticated: false,
        message: 'Not authenticated'
      }, {
        status: 401
      });
    }
    
    // Verify the JWT using jose
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    // Return the user info
    return Response.json({
      authenticated: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    });
  } catch (error) {
    console.error("JWT verification error:", error);
    return Response.json({ 
      authenticated: false,
      message: error.message || 'Invalid token'
    }, {
      status: 401
    });
  }
} 