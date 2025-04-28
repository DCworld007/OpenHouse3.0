import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

export async function GET(request: NextRequest) {
  const idToken = request.cookies.get('id_token')?.value;
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: process.env.AUTH0_CLIENT_ID,
    });
    return NextResponse.json({ user: payload });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export const runtime = 'edge'; 