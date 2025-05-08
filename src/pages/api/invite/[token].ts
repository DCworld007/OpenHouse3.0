import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

interface InviteTokenRecord {
  id: string;
  planningRoomId: string;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  isActive: number;
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // Path is /api/invite/[token], so token is the last segment
  const tokenValue = pathSegments[pathSegments.length - 1];

  if (!tokenValue || typeof tokenValue !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing invite token' }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';

  try {
    let db;
    try {
      const cloudflare = getCloudflareContext();
      db = cloudflare.env.DB;
    } catch (e) {
      console.warn('[API GET Invite Token] Could not get Cloudflare context. Trying process.env.DB.');
      db = (process.env as any).DB;
    }

    if (!db) {
      console.error('[API GET Invite Token] D1 database (DB binding) not found');
      // Don't redirect here, as it might mask the server error. 
      // Client-side will see a 500 if this occurs.
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const inviteQuery = 'SELECT id, planningRoomId, expiresAt, maxUses, usesCount, isActive FROM InviteTokens WHERE token = ?';
    const invite = await db.prepare(inviteQuery).bind(tokenValue).first() as InviteTokenRecord | null;

    if (!invite) {
      console.log(`[API GET Invite Token] Token not found: ${tokenValue}`);
      return NextResponse.redirect(new URL('/invite-invalid?error=not_found', baseUrl), 302);
    }

    if (invite.isActive !== 1) {
      console.log(`[API GET Invite Token] Token not active: ${tokenValue}`);
      return NextResponse.redirect(new URL('/invite-invalid?error=not_active', baseUrl), 302);
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      console.log(`[API GET Invite Token] Token expired: ${tokenValue}`);
      // Optionally, update isActive to 0 in DB
      // await db.prepare("UPDATE InviteTokens SET isActive = 0 WHERE id = ?").bind(invite.id).run();
      return NextResponse.redirect(new URL('/invite-invalid?error=expired', baseUrl), 302);
    }

    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      console.log(`[API GET Invite Token] Token max uses reached: ${tokenValue}`);
      // Optionally, update isActive to 0 in DB
      // await db.prepare("UPDATE InviteTokens SET isActive = 0 WHERE id = ?").bind(invite.id).run();
      return NextResponse.redirect(new URL('/invite-invalid?error=max_uses_reached', baseUrl), 302);
    }

    // Token is valid, redirect to a join confirmation page, passing the token
    // The frontend page /join will handle displaying group info and the actual join action.
    const joinUrl = new URL('/join', baseUrl);
    joinUrl.searchParams.set('token', tokenValue);
    return NextResponse.redirect(joinUrl.toString(), 302);

  } catch (error: any) {
    console.error('[API GET Invite Token] Error validating invite token:', error, error.cause);
    // For unexpected errors, redirect to a generic invalid invite page or error page
    return NextResponse.redirect(new URL('/invite-invalid?error=server_error', baseUrl), 302);
  }
} 