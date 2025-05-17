import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';

export const runtime = 'edge';

/**
 * GET handler for the /api/auth/me endpoint
 * Verifies the user's authentication and returns user info if authenticated
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API Auth Me] Request received');
    
    // Get the token from cookies or headers
    const token = request.cookies.get('token')?.value || 
                request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('[API Auth Me] No token found');
      return NextResponse.json({
        authenticated: false,
        message: 'Not authenticated'
      }, {
        status: 401
      });
    }

    // Verify the token
    try {
      const { payload } = await verifyToken(token);
      
      console.log('[API Auth Me] Authentication successful for user:', payload.email);
      
      // Return user data in the format expected by the frontend
      return NextResponse.json({
        authenticated: true,
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }
      });
    } catch (verifyError) {
      console.error('[API Auth Me] Token verification failed:', verifyError);
      return NextResponse.json({
        authenticated: false,
        message: 'Invalid token'
      }, {
        status: 401
      });
    }
  } catch (error: any) {
    console.error("[API Auth Me] Server error:", error);
    return NextResponse.json({ 
      authenticated: false,
      message: error.message || 'Server error'
    }, {
      status: 500
    });
  }
} 