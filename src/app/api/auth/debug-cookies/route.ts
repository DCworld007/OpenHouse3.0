import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Get JWT secret from environment or use dev secret
const JWT_SECRET = process.env.JWT_SECRET || 'Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Get all cookies
    const cookies: Record<string, string> = {};
    request.cookies.getAll().forEach(cookie => {
      cookies[cookie.name] = cookie.value;
    });
    
    // Get auth cookie
    const authCookie = request.cookies.get('auth_token');
    
    // Try to verify JWT if it exists
    let verificationResult: any = null;
    let decodedPayload: any = null;
    
    if (authCookie && authCookie.value) {
      try {
        // Try to decode without verification
        const parts = authCookie.value.split('.');
        if (parts.length === 3) {
          const decoded = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString()
          );
          decodedPayload = decoded;
        }
        
        // Try to verify JWT
        const { payload } = await jwtVerify(
          authCookie.value, 
          new TextEncoder().encode(JWT_SECRET)
        );
        
        verificationResult = {
          success: true,
          payload
        };
      } catch (jwtError: any) {
        verificationResult = {
          success: false,
          error: jwtError.message
        };
      }
    }
    
    // Return all debug info
    return NextResponse.json({
      cookies,
      hasAuthCookie: !!authCookie,
      authCookieValue: authCookie ? authCookie.value : null,
      decodedPayload,
      verificationResult,
      headers: Object.fromEntries(request.headers.entries()),
      secret: JWT_SECRET.substring(0, 3) + '...' // Only show first 3 chars for security
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug error',
      message: error.message
    }, { status: 500 });
  }
} 