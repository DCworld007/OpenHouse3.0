import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import crypto from 'crypto';
import * as jose from 'jose';

export const runtime = 'edge';

interface InviteTokenRecord {
  id: string;
  planningRoomId: string;
  expiresAt: string | null;
  maxUses: number | null;
  usesCount: number;
  isActive: number;
}

// Helper to get user ID from JWT (adapted from invite generation endpoint)
async function getUserIdFromJwt(req: NextRequest): Promise<string | null> {
  const tokenCookie = req.cookies.get('token'); 
  if (!tokenCookie) {
    return null;
  }
  const jwt = tokenCookie.value;
  const secretString = process.env.JWT_SECRET;
  if (!secretString) {
    console.error('JWT_SECRET is not defined in environment variables.');
    return null;
  }
  const secret = new TextEncoder().encode(secretString);
  try {
    const { payload } = await jose.jwtVerify(jwt, secret);
    return payload.sub as string || null; 
  } catch (err) {
    console.error('JWT verification failed for join endpoint:', err);
    return null;
  }
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const currentUserId = await getUserIdFromJwt(req);
  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or missing user token' }, { status: 401 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // Path is /api/invite/[token]/join, so token is 3rd from last
  const tokenValue = pathSegments[pathSegments.length - 2];

  if (!tokenValue || typeof tokenValue !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing invite token in URL' }, { status: 400 });
  }

  try {
    let db;
    try {
      const cloudflare = getCloudflareContext();
      db = cloudflare.env.DB;
    } catch (e) {
      console.warn('[API POST Join] Could not get Cloudflare context. Trying process.env.DB.');
      db = (process.env as any).DB;
    }

    if (!db) {
      console.error('[API POST Join] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // 1. Fetch and Re-validate Invite Token
    const inviteQuery = 'SELECT id, planningRoomId, expiresAt, maxUses, usesCount, isActive FROM InviteTokens WHERE token = ?';
    const invite = await db.prepare(inviteQuery).bind(tokenValue).first() as InviteTokenRecord | null;

    if (!invite) {
      return NextResponse.json({ error: 'Invite token not found' }, { status: 404 });
    }
    if (invite.isActive !== 1) {
      return NextResponse.json({ error: 'Invite token is no longer active' }, { status: 410 }); // Gone
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      // Optionally: Deactivate token in DB
      // await db.prepare("UPDATE InviteTokens SET isActive = 0 WHERE id = ?").bind(invite.id).run();
      return NextResponse.json({ error: 'Invite token has expired' }, { status: 410 });
    }
    if (invite.maxUses !== null && invite.usesCount >= invite.maxUses) {
      // Optionally: Deactivate token in DB if not already
      // await db.prepare("UPDATE InviteTokens SET isActive = 0 WHERE id = ?").bind(invite.id).run();
      return NextResponse.json({ error: 'Invite token has reached its maximum number of uses' }, { status: 410 });
    }

    // 2. Check if user is already a member
    const memberCheckQuery = 'SELECT id FROM RoomMember WHERE userId = ? AND roomId = ?';
    const existingMember = await db.prepare(memberCheckQuery).bind(currentUserId, invite.planningRoomId).first();

    if (existingMember) {
      // User is already a member. Decide on behavior: error or success (idempotent)
      // For now, let's treat it as success, they are in the room.
      return NextResponse.json({ success: true, message: 'User is already a member of this room', planningRoomId: invite.planningRoomId });
    }

    // 3. Add user to RoomMember table
    const newMemberId = crypto.randomUUID();
    const defaultRole = 'member'; // Or make this configurable
    const currentTime = new Date().toISOString();

    const addMemberQuery = `
      INSERT INTO RoomMember (id, userId, roomId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.prepare(addMemberQuery).bind(
      newMemberId,
      currentUserId,
      invite.planningRoomId,
      defaultRole,
      currentTime,
      currentTime
    ).run();

    // 4. Increment usesCount and potentially deactivate token
    const newUsesCount = invite.usesCount + 1;
    let deactivateToken = false;
    if (invite.maxUses !== null && newUsesCount >= invite.maxUses) {
      deactivateToken = true;
    }

    const updateTokenQuery = deactivateToken
      ? 'UPDATE InviteTokens SET usesCount = ?, isActive = 0 WHERE id = ?'
      : 'UPDATE InviteTokens SET usesCount = ? WHERE id = ?';
    
    if (deactivateToken) {
      await db.prepare(updateTokenQuery).bind(newUsesCount, invite.id).run();
    } else {
      await db.prepare(updateTokenQuery).bind(newUsesCount, invite.id).run();
    }

    return NextResponse.json({ success: true, message: 'Successfully joined the room', planningRoomId: invite.planningRoomId }, { status: 200 });

  } catch (error: any) {
    console.error('[API POST Join] Error processing join request:', error, error.cause);
    return NextResponse.json({ error: 'Failed to process join request', details: error.message }, { status: 500 });
  }
} 