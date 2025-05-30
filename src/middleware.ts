import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './utils/jwt';

// Add auth test page to public paths
const PUBLIC_PATHS = [
  '/', 
  '/auth/login', 
  '/auth/signup', 
  '/auth/test-token',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/invite'
];

async function verifyJWT(token: string) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[middleware] JWT verification failed:', error);
    throw error;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookies (try both formats)
  const token = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;

  if (!token) {
    console.log('[middleware] No auth token found');
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // For development/testing, allow unsigned tokens
    if (process.env.NODE_ENV === 'development' && token.endsWith('.unsigned')) {
      console.log('[middleware] Allowing unsigned token in development');
      return NextResponse.next();
    }

    // Verify JWT token
    const payload = await verifyJWT(token);
    
    if (!payload.sub || !payload.email) {
      console.error('[middleware] Invalid token payload:', payload);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('[middleware] Auth error:', error);
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 