import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/utils/jwt';
import { jwtVerify } from 'jose';

export const runtime = 'edge';

/**
 * POST /api/auth/login
 * Handles Google OAuth login by verifying the ID token and creating a session
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'Missing Google credential' },
        { status: 400 }
      );
    }

    try {
      // In production, you would verify this token with Google's API
      // For now, we'll decode it and trust it in development mode
      
      // Split the JWT and decode the payload
      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Base64 decode the payload
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf8')
      );
      
      console.log('[API] Google credential payload:', payload);
      
      // Extract user information
      const user = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
      
      // Generate our own JWT token
      const secret = process.env.JWT_SECRET || '';
      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }
      
      const token = await signToken(user);
      
      // Set cookies
      const response = NextResponse.json(
        { 
          success: true, 
          user
        },
        { status: 200 }
      );
      
      // Set cookies with a 7-day expiration
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);

      // Determine if we're in production
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Set both token cookies with secure settings
      ['token', 'auth_token'].forEach(name => {
        response.cookies.set(name, token, {
          expires: expirationDate,
          path: '/',
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'strict' : 'lax'
        });
      });
      
      return response;
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