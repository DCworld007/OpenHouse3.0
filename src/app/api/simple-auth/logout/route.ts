import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[Logout API] Request received');
    
    // Check if the token exists first
    const token = request.cookies.get('token')?.value;
    
    // Create a response
    const response = NextResponse.json({ success: true });
    
    // Clear the token cookie
    response.cookies.set({
      name: 'token',
      value: '',
      expires: new Date(0), // Immediate expiration
      path: '/',
    });
    
    console.log('[Logout API] Token cookie cleared, user logged out');
    
    return response;
  } catch (error) {
    console.error('[Logout API] Error in logout endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 