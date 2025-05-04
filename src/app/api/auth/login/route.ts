import { NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

export const runtime = 'edge';

const GOOGLE_ISSUERS = [
  'accounts.google.com',
  'https://accounts.google.com',
];

async function getGooglePublicKeys() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const { keys } = await res.json();
  return keys;
}

async function verifyGoogleIdToken(idToken: string) {
  const keys = await getGooglePublicKeys();
  const header = JSON.parse(atob(idToken.split('.')[0]));
  const key = keys.find((k: any) => k.kid === header.kid);
  if (!key) throw new Error('Google public key not found');
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const { payload } = await jwtVerify(idToken, publicKey, {
    issuer: GOOGLE_ISSUERS,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return payload;
}

async function createJWT(user: any) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return await new SignJWT({
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();
    if (!credential) return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    const payload = await verifyGoogleIdToken(credential);
    // You can store user info in D1/KV here if needed
    const jwt = await createJWT(payload);
    const res = NextResponse.json({ ok: true });
    res.headers.set('Set-Cookie', `token=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Login failed' }, { status: 401 });
  }
} 