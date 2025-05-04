import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/token=([^;]+)/);
    if (!match) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const token = match[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    // Only return safe user info
    const { sub, email, name, picture } = payload as any;
    return NextResponse.json({ sub, email, name, picture });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Not authenticated' }, { status: 401 });
  }
} 