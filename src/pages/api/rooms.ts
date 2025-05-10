import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as jose from 'jose'; // Using jose for JWT verification
import crypto from 'crypto';

export const runtime = 'edge';

// Helper to get user ID from JWT
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
    const { payload } = await jose.jwtVerify(jwt, secret, {});
    return payload.sub as string || null;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

export default async function handler(req: NextRequest) {
  // Handle POST requests for creating rooms
  if (req.method === 'POST') {
    const userId = await getUserIdFromJwt(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate required fields
    const { id, name, description } = body;
    if (!id || !name) {
      return NextResponse.json({ error: 'Room ID and name are required' }, { status: 400 });
    }

    try {
      // Get D1 database connection
      let db;
      try {
        const cloudflare = getCloudflareContext();
        db = cloudflare.env.DB;
      } catch (e) {
        console.warn('[API Rooms POST] Could not get Cloudflare context. Trying process.env.DB.');
        db = (process.env as any).DB;
      }

      if (!db) {
        console.error('[API Rooms POST] D1 database (DB binding) not found');
        return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
      }

      // Check if room already exists
      const existingRoom = await db.prepare('SELECT id FROM PlanningRoom WHERE id = ?').bind(id).first();
      if (existingRoom) {
        // Room already exists, return success
        return NextResponse.json({ 
          success: true, 
          message: 'Room already exists',
          roomId: id
        }, { status: 200 });
      }

      // Create room
      const now = new Date().toISOString();
      const insertRoomStmt = db.prepare(`
        INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await insertRoomStmt.bind(
        id,
        name,
        description || '',
        userId,
        now,
        now
      ).run();

      // Add user as owner member
      const roomMemberId = crypto.randomUUID();
      const insertMemberStmt = db.prepare(`
        INSERT INTO RoomMember (id, roomId, userId, role, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await insertMemberStmt.bind(
        roomMemberId,
        id,
        userId,
        'owner',
        now,
        now
      ).run();

      return NextResponse.json({ 
        success: true, 
        message: 'Room created successfully',
        roomId: id
      }, { status: 201 });
    } catch (error: any) {
      console.error('[API Rooms POST] Error creating room:', error);
      return NextResponse.json({ 
        error: 'Failed to create room', 
        details: error.message 
      }, { status: 500 });
    }
  }

  // Handle GET requests for fetching rooms
  else if (req.method === 'GET') {
    const userId = await getUserIdFromJwt(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
    }

    try {
      // Get D1 database connection
      let db;
      try {
        const cloudflare = getCloudflareContext();
        db = cloudflare.env.DB;
      } catch (e) {
        console.warn('[API Rooms GET] Could not get Cloudflare context. Trying process.env.DB.');
        db = (process.env as any).DB;
      }

      if (!db) {
        console.error('[API Rooms GET] D1 database (DB binding) not found');
        return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
      }

      // Get rooms where user is member
      const roomsQuery = `
        SELECT r.*, u.id as ownerId, u.name as ownerName, u.email as ownerEmail, u.image as ownerImage
        FROM PlanningRoom r
        LEFT JOIN User u ON r.ownerId = u.id
        INNER JOIN RoomMember rm ON r.id = rm.roomId
        WHERE rm.userId = ?
      `;
      const roomsResult = await db.prepare(roomsQuery).bind(userId).all();

      if (!roomsResult.results) {
        return NextResponse.json({ rooms: [] }, { status: 200 });
      }

      return NextResponse.json({ 
        rooms: roomsResult.results 
      }, { status: 200 });
    } catch (error: any) {
      console.error('[API Rooms GET] Error fetching rooms:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch rooms', 
        details: error.message 
      }, { status: 500 });
    }
  }

  // Handle unsupported methods
  else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
} 