// Removed: import { withClerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from 'jose';
import { getJwtSecret } from "./utils/jwt";

// This function can be marked as an edge function
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

// Add auth test page to public paths
const PUBLIC_PATHS = ['/', '/auth/login', '/auth/signup', '/auth/test-token'];

async function verifyJWT(token: string) {
  try {
    // DIRECT HARDCODING: This is needed because the utility function is not working properly in the middleware context
    const secretValue = "X7d4KjP9Rt6vQ8sFbZ2mEwHc5LnAaYpG3xNzVuJq"; // New 32-character secret from .dev.vars
    
    const secret = new TextEncoder().encode(secretValue);
    
    // For debugging, decode the token header and payload without verification
    const parts = token.split('.');
    if (parts.length >= 2) {
      try {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        console.log('[middleware] Token header:', header);
        console.log('[middleware] Token payload:', payload);
      } catch (e) {
        console.error('[middleware] Failed to decode token parts:', e);
      }
    }
    
    // Perform verification
    const { payload } = await jwtVerify(token, secret);
    console.log('[middleware] JWT verified successfully:', { sub: payload.sub, email: payload.email });
    return payload;
  } catch (error) {
    console.error('[middleware] JWT verification failed:', error);
    throw error;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug output
  console.log('[middleware] pathname:', pathname);
  
  // Get all cookies for thorough debugging
  const allCookies = request.cookies.getAll();
  console.log('[middleware] cookies:', allCookies);
  
  // Check for a token in cookies
  const normalToken = request.cookies.get('token')?.value;
  const altToken = request.cookies.get('auth_token')?.value;
  
  // Also check for Authorization header as fallback (client can send localStorage token in header)
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Use whatever token we can find
  const token = normalToken || altToken || headerToken;
  
  console.log('[middleware] token sources:', { 
    cookie: normalToken ? 'present' : 'missing', 
    altCookie: altToken ? 'present' : 'missing',
    authHeader: headerToken ? 'present' : 'missing'
  });

  // Allow public paths (home page, login, signup)
  if (PUBLIC_PATHS.includes(pathname)) {
    console.log('[middleware] Allowing public path:', pathname);
    return NextResponse.next();
  }

  // Check for JWT in cookies
  if (!token) {
    console.log('[middleware] No token found, redirecting to login');
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  try {
    const user = await verifyJWT(token);
    if (!user) {
      console.log('[middleware] Invalid token, redirecting to login');
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }

    console.log('[middleware] Authentication successful, proceeding to:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.error('[middleware] Authentication error:', error);
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }
} 