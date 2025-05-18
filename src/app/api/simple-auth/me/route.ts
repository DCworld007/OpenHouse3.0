import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    console.log('[Me API] Request received');
    
    // Check for token in cookies
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      console.log('[Me API] No token found in cookies');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[Me API] Token found, attempting to verify');
    
    try {
      // Verify the token
      const secretValue = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz"; // Same as in middleware.ts
      const secret = new TextEncoder().encode(secretValue);
      const { payload } = await jwtVerify(token, secret);
      
      console.log('[Me API] Token verified successfully:', { 
        sub: payload.sub, 
        email: payload.email 
      });
      
      // Return the user data
      return NextResponse.json({
        user: {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        }
      });
    } catch (error) {
      console.error('[Me API] Token verification error:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('[Me API] Error in me endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 