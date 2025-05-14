import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// User type definition
export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

// Auth result type
export type AuthResult = 
  | { authenticated: true; user: User } 
  | { authenticated: false; error: string };

/**
 * Get the JWT secret from environment or use default for development
 */
export const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz';
};

/**
 * Sign a JWT token with user data
 */
export async function signToken(payload: any) {
  const secret = new TextEncoder().encode(getJwtSecret());
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string) {
  const secret = new TextEncoder().encode(getJwtSecret());
  return await jwtVerify(token, secret);
}

/**
 * Extract and verify auth token from request
 */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthResult> {
  // Try both cookie names
  const authCookie = request.cookies.get('auth_token') || request.cookies.get('token');
  
  if (!authCookie || !authCookie.value) {
    // Try parsing from cookie header as fallback
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ')
        .filter(Boolean)
        .map(pair => {
          const [name, ...rest] = pair.split('=');
          return [name, rest.join('=')];
        })
    );
    
    const token = cookies['auth_token'] || cookies['token'];
    if (!token) {
      return { authenticated: false, error: 'No auth token found' };
    }
    
    try {
      const { payload } = await verifyToken(token);
      return { 
        authenticated: true, 
        user: {
          id: String(payload.sub),
          email: String(payload.email),
          name: String(payload.name || ''),
          picture: String(payload.picture || '')
        }
      };
    } catch (error) {
      return { authenticated: false, error: 'Invalid token' };
    }
  }
  
  try {
    const { payload } = await verifyToken(authCookie.value);
    return { 
      authenticated: true, 
      user: {
        id: String(payload.sub),
        email: String(payload.email),
        name: String(payload.name || ''),
        picture: String(payload.picture || '')
      }
    };
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
} 