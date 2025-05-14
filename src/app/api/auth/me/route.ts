import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, AuthResult } from '@/utils/auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    console.log('[API Auth Me] Request received at', new Date().toISOString());
    
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log('[API Auth Me] All cookies:', JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 10) + '...' }))));
    
    // Get auth from request using our utility
    const auth: AuthResult = await getAuthFromRequest(request);
    
    if (!auth.authenticated) {
      console.log('[API Auth Me] Authentication failed:', auth.error);
      
      // Check for cookie in header directly for debugging
      const cookieHeader = request.headers.get('cookie') || '';
      console.log('[API Auth Me] Cookie header:', cookieHeader);
      
      return NextResponse.json(
        { authenticated: false, error: auth.error },
        { status: 401 }
      );
    }

    console.log('[API Auth Me] Authentication successful for user:', auth.user.email);
    
    // Return user data in the format expected by the frontend
    return NextResponse.json({
      authenticated: true,
      user: auth.user
    });
  } catch (error) {
    console.error('[API Auth Me] Unexpected error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 