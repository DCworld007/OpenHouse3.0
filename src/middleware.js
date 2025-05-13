import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Generate a secret key - in production, this should be an environment variable
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long-here!!!!'
);

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
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for token in cookies
  const token = request.cookies.get('token')?.value;
  
  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    // Token is valid, allow request
    return NextResponse.next();
  } catch (error) {
    console.error('JWT verification error in middleware:', error);
    
    // Invalid token, redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
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