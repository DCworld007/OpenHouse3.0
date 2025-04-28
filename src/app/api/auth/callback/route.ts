import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code found' }, { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.AUTH0_CLIENT_ID!,
      client_secret: process.env.AUTH0_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.APP_BASE_URL}/api/auth/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 401 });
  }

  const tokenData = await tokenRes.json();
  const { id_token, access_token } = tokenData;

  // Set tokens in HttpOnly cookies
  const isProd = process.env.NODE_ENV === 'production';
  const response = NextResponse.redirect(process.env.APP_BASE_URL!);
  response.cookies.set('id_token', id_token, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
  response.cookies.set('access_token', access_token, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
  return response;
}

export const runtime = 'edge'; 