// Removed: import { withClerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from 'jose';

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

async function verifyJWT(token: string | undefined) {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug output
  console.log('[middleware] pathname:', pathname);
  console.log('[middleware] token:', request.cookies.get('token')?.value);

  // Allow public paths (home page, login, signup)
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for JWT in cookies
  const token = request.cookies.get('token')?.value;
  const user = await verifyJWT(token);

  if (!user) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Optionally, attach user info to request (for edge API routes)
  // request.user = user;

  return NextResponse.next();
} 