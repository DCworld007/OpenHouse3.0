import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import crypto from 'crypto';
import * as jose from 'jose'; // Using jose for JWT verification

export const runtime = 'edge';

// Helper function to generate a secure token
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Helper to get user ID from JWT
async function getUserIdFromJwt(req: NextRequest): Promise<string | null> {
  const tokenCookie = req.cookies.get('token'); // YOU STILL NEED TO REPLACE 'AuthToken' with your actual JWT cookie name
  if (!tokenCookie) {
    return null;
  }
  const jwt = tokenCookie.value;
  // Using JWT_SECRET based on your .env.local file
  const secretString = process.env.JWT_SECRET;
  if (!secretString) {
    console.error('JWT_SECRET is not defined in environment variables.');
    return null;
  }
  const secret = new TextEncoder().encode(secretString);

  try {
    const { payload } = await jose.jwtVerify(jwt, secret, {
      // Specify expected algorithms if necessary, e.g., algorithms: ['HS256']
    });
    // YOU STILL NEED TO ADJUST payload.sub || payload.userId to match your JWT's user ID claim
    return payload.sub as string || null;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const currentUserId = await getUserIdFromJwt(req);

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const groupId = pathSegments[pathSegments.length - 3];

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }

  try {
    let db;
    try {
      const cloudflare = getCloudflareContext();
      db = cloudflare.env.DB;
    } catch (e) {
      console.warn('[API Invite POST] Could not get Cloudflare context. Trying process.env.DB.');
      db = (process.env as any).DB;
    }

    if (!db) {
      console.error('[API Invite POST] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    console.log(`[API Invite POST] Looking for planning room with ID: ${groupId}`);
    
    const roomQuery = 'SELECT ownerId FROM PlanningRoom WHERE id = ?';
    const room = await db.prepare(roomQuery).bind(groupId).first() as { ownerId: string } | null;

    if (!room) {
      console.error(`[API Invite POST] Planning room not found for ID: ${groupId}`);
      
      const allRoomsStmt = db.prepare('SELECT id FROM PlanningRoom').all();
      const allRoomsResult = await allRoomsStmt;
      const allRoomIds = allRoomsResult.results?.map((r: any) => r.id) || [];
      
      console.log(`[API Invite POST] Available room IDs in database: ${JSON.stringify(allRoomIds)}`);
      
      return NextResponse.json({ 
        error: 'Planning room not found',
        roomId: groupId,
        availableRooms: allRoomIds.length
      }, { status: 404 });
    }

    console.log(`[API Invite POST] Found planning room with ID: ${groupId}, ownerId: ${room.ownerId}`);

    if (room.ownerId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden: Only the room owner can create invites' }, { status: 403 });
    }

    const expiresAt = null;
    const maxUses = null;
    const tokenString = generateSecureToken();
    const newInviteId = crypto.randomUUID();

    // Check if InviteTokens table exists, create it if not
    try {
      await db.prepare(`SELECT 1 FROM InviteTokens LIMIT 1`).first();
    } catch (e) {
      console.log('[API Invite POST] InviteTokens table does not exist, creating it...');
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS InviteTokens (
            id TEXT PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            planningRoomId TEXT NOT NULL,
            generatedByUserId TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            expiresAt TEXT,
            maxUses INTEGER,
            usesCount INTEGER NOT NULL DEFAULT 0,
            isActive INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (planningRoomId) REFERENCES PlanningRoom(id) ON DELETE CASCADE,
            FOREIGN KEY (generatedByUserId) REFERENCES User(id) ON DELETE CASCADE
          )
        `).run();
        console.log('[API Invite POST] InviteTokens table created successfully');
      } catch (createError: any) {
        console.error('[API Invite POST] Failed to create InviteTokens table:', createError);
        return NextResponse.json({ 
          error: 'Failed to create invite: InviteTokens table could not be created', 
          details: createError.message 
        }, { status: 500 });
      }
    }

    const insertQuery = `
      INSERT INTO InviteTokens (id, token, planningRoomId, generatedByUserId, expiresAt, maxUses)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await db.prepare(insertQuery).bind(
      newInviteId,
      tokenString,
      groupId,
      currentUserId,
      expiresAt,
      maxUses
    ).run();

    const inviteLink = `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/invite/${tokenString}`;

    return NextResponse.json({ 
      success: true, 
      inviteToken: tokenString, 
      inviteLink: inviteLink,
      inviteId: newInviteId 
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API Invite POST] Error creating invite:', error, error.cause);
    return NextResponse.json({ error: 'Failed to create invite', details: error.message }, { status: 500 });
  }
} 