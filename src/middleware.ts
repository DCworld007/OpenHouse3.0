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

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/signup'];

async function verifyJWT(token: string) {
  try {
    // DIRECT HARDCODING: This is needed because the utility function is not working properly in the middleware context
    const secretValue = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz"; // 32-character secret from .dev.vars
    console.log('[middleware] Using hardcoded secret');
    console.log('[middleware] Secret length:', secretValue.length);
    
    const secret = new TextEncoder().encode(secretValue);
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
  console.log('[middleware] cookies:', request.cookies.getAll());
  console.log('[middleware] token:', request.cookies.get('token')?.value);

  // Allow public paths (home page, login, signup)
  if (PUBLIC_PATHS.includes(pathname)) {
    console.log('[middleware] Allowing public path:', pathname);
    return NextResponse.next();
  }

  // Check for JWT in cookies
  const token = request.cookies.get('token')?.value;
  if (!token) {
    console.log('[middleware] No token found, redirecting to login');
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  const user = await verifyJWT(token);
  if (!user) {
    console.log('[middleware] Invalid token, redirecting to login');
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  console.log('[middleware] Authentication successful, proceeding to:', pathname);
  return NextResponse.next();
} 