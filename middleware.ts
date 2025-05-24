// Removed: import { withClerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from 'jose';
import { getJwtSecret } from "./src/utils/jwt";

// This function can be marked as an edge function
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

// Add auth test page to public paths
const PUBLIC_PATHS = ['/', '/auth/login', '/auth/signup', '/auth/test-token', '/api/auth/login', '/api/auth/logout', '/api/auth/me', '/invite'];

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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add CORS headers to all responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS requests for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return response;
  }

  // Check for JWT in cookies
  const token = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;

  if (!token) {
    const url = new URL('/auth/login', request.url);
    // Preserve the full URL including query parameters
    url.searchParams.set('returnTo', encodeURIComponent(request.url));
    return NextResponse.redirect(url);
  }

  try {
    const user = await verifyJWT(token);
    if (!user) {
      const url = new URL('/auth/login', request.url);
      // Preserve the full URL including query parameters
      url.searchParams.set('returnTo', encodeURIComponent(request.url));
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    const url = new URL('/auth/login', request.url);
    // Preserve the full URL including query parameters
    url.searchParams.set('returnTo', encodeURIComponent(request.url));
    return NextResponse.redirect(url);
  }
} 