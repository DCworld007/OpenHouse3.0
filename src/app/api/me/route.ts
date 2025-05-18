import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';

export const runtime = 'edge';

/**
 * Proxy for the Cloudflare /api/me Function
 * This handles the user info endpoint in the Next.js app router
 */
export async function GET(request: NextRequest) {
  try {
    // Log all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log('[API] /api/me - All cookies:', JSON.stringify(allCookies));
    
    // Get the token from cookies
    const token = request.cookies.get('token')?.value;
    console.log('[API] /api/me - Cookie token:', token ? 'Present' : 'Missing');
    
    // For debugging - try alternate cookie names
    const altTokenValue = request.cookies.get('auth_token')?.value;
    if (altTokenValue) {
      console.log('[API] /api/me - Found alternate auth_token cookie');
    }
    
    // Check authorization header (for localStorage fallback)
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (headerToken) {
      console.log('[API] /api/me - Found token in Authorization header');
    }
    
    // Get the full cookie header for inspection
    const cookieHeader = request.headers.get('cookie');
    console.log('[API] /api/me - Raw cookie header:', cookieHeader);
    
    // Use whatever token we can find
    const tokenToUse = token || altTokenValue || headerToken;
    
    if (!tokenToUse) {
      console.log('[API] /api/me - No token found in cookies or headers');
      return NextResponse.json(
        { authenticated: false, error: 'Not authenticated: No token found', debug: { cookies: allCookies } },
        { status: 401 }
      );
    }
    
    try {
      // Verify token
      const { payload } = await verifyToken(tokenToUse);
      
      // Extract user info
      const { sub, email, name, picture } = payload;
      
      console.log('[API] /api/me - User authenticated:', { sub, email, name });
      
      // Return user info
      return NextResponse.json({ 
        authenticated: true,
        user: {
          id: sub, 
          email, 
          name, 
          picture: picture || null // Handle missing picture
        }
      });
    } catch (err) {
      console.error('[API] /api/me - Token verification error:', err);
      
      // For debugging - try to extract the payload without verification
      try {
        const parts = tokenToUse.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('[API] /api/me - Decoded (unverified) payload:', payload);
          
          // For development, if we can extract payload, return it
          if (process.env.NODE_ENV === 'development') {
            console.log('[API] /api/me - Dev mode: Allowing unverified token');
            return NextResponse.json({ 
              authenticated: true,
              user: {
                id: payload.sub, 
                email: payload.email, 
                name: payload.name, 
                picture: payload.picture || null
              },
              warning: "Token decoded but not verified (development only)"
            });
          }
        }
      } catch (decodeErr) {
        console.error('[API] /api/me - Failed to decode token:', decodeErr);
      }
      
      return NextResponse.json(
        { 
          authenticated: false, 
          error: 'Invalid token',
          debug: { 
            tokenLength: tokenToUse?.length,
            cookies: allCookies
          }
        },
        { status: 401 }
      );
    }
  } catch (e: any) {
    console.error('[API] /api/me - Error:', e);
    return NextResponse.json(
      { authenticated: false, error: e.message || 'Server error' },
      { status: 500 }
    );
  }
} 