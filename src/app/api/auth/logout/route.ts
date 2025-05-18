import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * POST /api/auth/logout
 * Clears authentication cookies and logs the user out
 */
export async function POST(request: NextRequest) {
  try {
    // Create a response
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );
    
    // Clear cookies by setting them to expire in the past
    const expiredDate = new Date(0);
    
    // Clear token cookie
    response.cookies.set({
      name: 'token',
      value: '',
      expires: expiredDate,
      path: '/',
      httpOnly: false, // Set to true in production
      sameSite: 'lax'
    });
    
    // Clear alternate token cookie
    response.cookies.set({
      name: 'auth_token',
      value: '',
      expires: expiredDate,
      path: '/',
      httpOnly: false, // Set to true in production
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('[API] Logout error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
} 