// Next.js API route for /api/me
export async function GET(request) {
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
  
  try {
    // Parse the token (simple parsing, not verifying)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    // Base64 decode payload
    const decodedPayload = atob(parts[1]);
    const payload = JSON.parse(decodedPayload);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return Response.json({ 
        authenticated: false, 
        message: 'Token expired'
      }, {
        status: 401
      });
    }
    
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
    return Response.json({ 
      authenticated: false,
      message: error.message || 'Invalid token'
    }, {
      status: 401
    });
  }
} 