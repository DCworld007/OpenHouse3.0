import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';
  const response = NextResponse.redirect(
    `https://${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(process.env.APP_BASE_URL!)}`
  );
  response.cookies.set('id_token', '', { maxAge: 0, path: '/', secure: isProd });
  response.cookies.set('access_token', '', { maxAge: 0, path: '/', secure: isProd });
  return response;
} 