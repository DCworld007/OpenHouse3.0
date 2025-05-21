import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken } from '@/utils/jwt';
import { getAuthDomain } from '@/utils/auth-config';

export const runtime = 'edge';

/**
 * POST /api/auth/login
 * Handles Google OAuth login by verifying the ID token and creating a session
 */
export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    try {
      // Verify Google token
      const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (!googleResponse.ok) {
        return NextResponse.json({ error: 'Invalid credential' }, { status: 401 });
      }

      const data = await googleResponse.json();
      if (!data.email_verified) {
        return NextResponse.json({ error: 'Email not verified' }, { status: 401 });
      }

      // Create JWT token
      const token = await signToken({
        sub: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture
      });

      // Get domain for cookies
      const authDomain = getAuthDomain().replace(/^https?:\/\//, '');
      const isProduction = process.env.NODE_ENV === 'production';
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // 7 days

      // Create response with both cookies
      const nextResponse = NextResponse.json({ ok: true });
      
      // Set both token cookies with secure settings
      ['token', 'auth_token'].forEach(name => {
        nextResponse.cookies.set(name, token, {
          expires: expirationDate,
          path: '/',
          domain: authDomain,
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'strict' : 'lax'
        });
      });
      
      return nextResponse;
    } catch (error) {
      console.error('[API] Error verifying Google credential:', error);
      return NextResponse.json(
        { error: 'Invalid credential' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[API] Login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 