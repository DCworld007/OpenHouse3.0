import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import crypto from 'crypto';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Get required fields
    const { id, name, userId } = body;
    if (!id || !name || !userId) {
      return NextResponse.json({ 
        error: 'Required fields missing', 
        requiredFields: ['id', 'name', 'userId'] 
      }, { status: 400 });
    }

    // Get D1 database connection
    let db;
    try {
      const cloudflare = getCloudflareContext();
      db = cloudflare.env.DB;
    } catch (e) {
      console.warn('[Admin Create Room] Could not get Cloudflare context. Trying process.env.DB.');
      db = (process.env as any).DB;
    }

    if (!db) {
      console.error('[Admin Create Room] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Check if room already exists
    const existingRoom = await db.prepare('SELECT id FROM PlanningRoom WHERE id = ?').bind(id).first();
    if (existingRoom) {
      return NextResponse.json({ 
        success: true, 
        message: 'Room already exists',
        roomId: id
      }, { status: 200 });
    }

    // Create room
    const now = new Date().toISOString();
    const description = body.description || '';
    
    // 1. Insert into PlanningRoom
    console.log('[Admin Create Room] Creating room', { id, name, userId });
    const insertRoomStmt = db.prepare(`
      INSERT INTO PlanningRoom (id, name, description, ownerId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await insertRoomStmt.bind(
      id,
      name,
      description,
      userId,
      now,
      now
    ).run();

    // 2. Insert into RoomMember
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

    // 3. Verify room was created
    const verifyRoomStmt = db.prepare('SELECT id, name FROM PlanningRoom WHERE id = ?');
    const verifiedRoom = await verifyRoomStmt.bind(id).first();

    return NextResponse.json({
      success: true,
      message: 'Room created successfully',
      roomId: id,
      verifiedRoom
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Admin Create Room] Error:', error);
    return NextResponse.json({
      error: 'Failed to create room',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 