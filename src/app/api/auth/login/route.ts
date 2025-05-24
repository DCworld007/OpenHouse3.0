import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken } from '@/utils/jwt';
import { getAuthDomain } from '@/utils/auth-config';
import { SignJWT } from 'jose';
import { getJwtSecret } from '@/utils/jwt';

export const runtime = 'edge';

/**
 * POST /api/auth/login
 * Handles Google OAuth login by verifying the ID token and creating a session
 */
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const requestBody = await request.json();
    const { credential } = requestBody;

    if (!credential) {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    try {
      // Verify Google ID token
      const googleResponse = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + credential);
      
      if (!googleResponse.ok) {
        console.error('[Login] Failed to verify Google token:', await googleResponse.text());
        return NextResponse.json({ error: 'Failed to verify Google token' }, { status: 401 });
      }
      
      const payload = await googleResponse.json();
      console.log('[Login] Google token payload:', payload);
      
      if (!payload.email_verified) {
        return NextResponse.json({ error: 'Email not verified' }, { status: 401 });
      }

      // Create JWT token
      const secret = await getJwtSecret();
      const token = await new SignJWT({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

      console.log('[Login] Generated JWT token');

      // Create response with cookie
      const nextResponse = NextResponse.json({ 
        ok: true,
        user: {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }
      });
      
      // Set both token formats
      const cookieOptions = {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'lax' as const
      };

      nextResponse.cookies.set('token', token, cookieOptions);
      nextResponse.cookies.set('auth_token', token, cookieOptions);

      return nextResponse;
    } catch (error) {
      console.error('[Login] Error:', error);
      return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
} 