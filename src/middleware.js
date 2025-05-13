export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
];

// Check if the path should be public
function isPublicPath(path) {
  return PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath)) || 
         path.startsWith('/_next') || 
         path.startsWith('/static') ||
         path.endsWith('.ico') ||
         path.endsWith('.svg') ||
         path.endsWith('.png') ||
         path.endsWith('.jpg') ||
         path.endsWith('.jpeg') ||
         path.endsWith('.gif');
}

export async function middleware(request) {
  try {
    console.log("[Middleware] Starting middleware for:", request.nextUrl.pathname);
    
    const { pathname } = request.nextUrl;
    
    // Allow public paths
    if (isPublicPath(pathname)) {
      console.log("[Middleware] Public path allowed:", pathname);
      return NextResponse.next();
    }

    // Check for token in cookies
    const token = request.cookies.get('token')?.value;
    
    // If no token, redirect to login
    if (!token) {
      console.log("[Middleware] No token found, redirecting to login");
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For Edge compatibility, we'll do a simple check that the token exists
    // The actual verification will be done in the API route
    console.log("[Middleware] Token exists, allowing request");
    return NextResponse.next();
    
  } catch (error) {
    console.error('[Middleware] Critical error:', error);
    
    // If middleware fails, allow the request to proceed
    // This prevents the app from being completely inaccessible
    return NextResponse.next();
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth/* (authentication API routes)
     * 2. /_next (Next.js internals)
     * 3. /static (static files)
     * 4. All files in the public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}; 