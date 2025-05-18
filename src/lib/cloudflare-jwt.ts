import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const ISSUER = 'openhouse3';
const AUDIENCE = 'openhouse3-users';
const TOKEN_EXPIRATION = '24h';

export async function createToken(payload: any, secret: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 60 * 60; // 24 hours

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(exp)
    .setIssuedAt(iat)
    .setNotBefore(iat)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(new TextEncoder().encode(secret));

  return token;
}

export async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        issuer: ISSUER,
        audience: AUDIENCE,
      }
    );
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getTokenFromRequest(request: Request | NextRequest): Promise<string | null> {
  // First check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Then check cookies
  if ('cookies' in request) {
    const nextRequest = request as NextRequest;
    const token = nextRequest.cookies.get('token')?.value;
    return token || null;
  } else {
    const cookieHeader = request.headers.get('Cookie');
    if (cookieHeader) {
      const cookies = new Map(
        cookieHeader.split(';').map(cookie => {
          const [key, value] = cookie.trim().split('=');
          return [key, value];
        })
      );
      return cookies.get('token') || null;
    }
  }

  return null;
}

export async function getUserFromRequest(request: Request | NextRequest, secret: string): Promise<any> {
  const token = await getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token, secret);
  return payload;
} 