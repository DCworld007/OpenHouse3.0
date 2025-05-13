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
         path.includes('favicon') ||
         path.includes('.svg') ||
         path.includes('.png') ||
         path.includes('.jpg');
}

export function middleware(request) {
  // Just log which path is being processed
  console.log("[Middleware] Processing:", request.nextUrl.pathname);
  
  const { pathname } = request.nextUrl;
  
  // Always allow public paths
  if (isPublicPath(pathname)) {
    console.log("[Middleware] Public path allowed:", pathname);
    return NextResponse.next();
  }
  
  // Check for token in cookies - simplified
  const token = request.cookies.get('token');
  
  // If no token, redirect to login
  if (!token) {
    console.log("[Middleware] No token, redirecting to login");
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Allow request to proceed
  console.log("[Middleware] Token found, allowing request");
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}; 