import { NextRequest, NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { signToken, getJwtSecret } from '@/utils/auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    console.log('[API Login] Received login request');
    
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json({ error: 'Google ID token is required' }, { status: 400 });
    }

    // Verify Google token with a direct fetch request instead of using google-auth-library
    try {
      console.log('[API Login] Verifying Google token');
      const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
        { 
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      if (!googleResponse.ok) {
        console.error('[API Login] Failed to verify Google token:', await googleResponse.text());
        return NextResponse.json({ error: 'Failed to verify Google token' }, { status: 401 });
      }
      
      const payload = await googleResponse.json();
      console.log('[API Login] Verified Google token for:', payload.email);
      
      if (!payload.email_verified) {
        return NextResponse.json({ error: 'Email not verified' }, { status: 401 });
      }
      
      // Create a user object from the Google response
      const user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };

      // Create JWT with user data using our signToken utility
      const token = await signToken({ 
        sub: user.id, // Use 'sub' instead of 'id' to match standards
        email: user.email,
        name: user.name,
        picture: user.picture
      });
      console.log('[API Login] Generated JWT token');

      // Set cookie - be consistent with the name auth_token
      const cookie = serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
        sameSite: 'lax'
      });

      console.log('[API Login] Login successful, returning response with cookie');
      return NextResponse.json(
        { 
          success: true,
          user: user // Include user object in response
        },
        { 
          status: 200,
          headers: { 
            'Set-Cookie': cookie
          }
        }
      );
    } catch (error) {
      console.error('[API Login] Google verification error:', error);
      return NextResponse.json({ error: 'Error verifying Google token' }, { status: 500 });
    }
  } catch (error) {
    console.error('[API Login] Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 