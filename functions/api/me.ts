import { verifyToken, getJwtSecret } from '../../src/utils/jwt';

export const onRequestGet = async (context: { request: Request; env: any }) => {
  const { request, env } = context;

  // Helper: parse cookies
  function getCookie(name: string) {
    const value = `; ${request.headers.get('cookie') || ''}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  try {
    // JWT verification (simple, for demo)
    // Update to use auth_token instead of token
    const token = getCookie('auth_token');
    if (!token) {
      return new Response(JSON.stringify({
        authenticated: false,
        message: 'Not authenticated'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse the token (simple parsing, not verifying)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Base64 decode the payload
    const decodeBase64 = (str: string) => {
      // Ensure the string is a valid base64 format by padding it
      const padding = '='.repeat((4 - str.length % 4) % 4);
      const base64 = (str + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      try {
        return atob(base64);
      } catch (e) {
        throw new Error('Failed to decode base64 string');
      }
    };

    const payload = JSON.parse(decodeBase64(parts[1]));

    // Return the user info
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
  } catch (error: any) {
    return new Response(JSON.stringify({
      authenticated: false,
      message: error.message || 'Invalid token'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 