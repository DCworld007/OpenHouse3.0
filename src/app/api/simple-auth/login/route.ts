import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export const runtime = 'edge';

// Secret for JWT signatures - should match the one in middleware.ts
const JWT_SECRET = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz";

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
      const token = await new SignJWT({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(JWT_SECRET));

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
      
      // Set the cookie
      nextResponse.cookies.set({
        name: 'token',
        value: token,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'lax'
      });

      return nextResponse;
    } catch (error) {
      console.error('[Login] Error verifying Google token:', error);
      return NextResponse.json({ error: 'Error verifying Google token' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Login] Error in login endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 