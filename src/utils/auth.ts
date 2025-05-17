/**
 * Server-side auth utilities
 */
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Define token expiry - 7 days
const TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  error?: string;
}

/**
 * Gets the JWT secret from environment variables
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'your-secret-key-for-development-only';
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT token for authentication
 */
export async function signToken(payload: any): Promise<string> {
  const secret = getJwtSecret();
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('openhouse3')
    .setAudience('openhouse3-users')
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_EXPIRY)
    .sign(secret);
  
  return token;
}

/**
 * Verifies a JWT token
 */
export async function verifyToken(token: string) {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return { valid: true, payload };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false, error: String(error) };
  }
}

/**
 * Extract authentication token from request headers, cookies, or URL
 */
export function getAuthToken(req: NextRequest): string | null {
  // Check authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies - parse from request headers directly for edge compatibility
  const cookieHeader = req.headers.get('cookie') || '';
  const parsedCookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name) parsedCookies[name] = value;
  });
  
  const token = parsedCookies['token'] || parsedCookies['auth_token'];
  if (token) {
    return token;
  }
  
  // Check URL params (for certain endpoints)
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  if (tokenFromQuery) {
    return tokenFromQuery;
  }
  
  return null;
}

/**
 * Get authentication from request
 */
export async function getAuthFromRequest(req: NextRequest): Promise<AuthResult> {
  try {
    const token = getAuthToken(req);
    
    if (!token) {
      return { authenticated: false, error: 'No authentication token found' };
    }
    
    const { valid, payload, error } = await verifyToken(token);
    
    if (!valid || !payload) {
      return { authenticated: false, error: error || 'Invalid token' };
    }
    
    return {
      authenticated: true,
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        name: payload.name as string,
        picture: payload.picture as string,
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { authenticated: false, error: 'Authentication error' };
  }
} 