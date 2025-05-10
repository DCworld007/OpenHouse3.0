import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get D1 database connection
    let db;
    try {
      const cloudflare = getCloudflareContext();
      db = cloudflare.env.DB;
    } catch (e) {
      console.warn('[Admin Planning Rooms] Could not get Cloudflare context. Trying process.env.DB.');
      db = (process.env as any).DB;
    }

    if (!db) {
      console.error('[Admin Planning Rooms] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Query all planning rooms
    const statement = db.prepare(`
      SELECT pr.*, COUNT(rm.id) as memberCount
      FROM PlanningRoom pr
      LEFT JOIN RoomMember rm ON pr.id = rm.roomId
      GROUP BY pr.id
      ORDER BY pr.createdAt DESC
    `);
    
    const result = await statement.all();

    return NextResponse.json({
      rooms: result.results || []
    });
  } catch (error: any) {
    console.error('[Admin Planning Rooms] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch planning rooms',
      details: error.message
    }, { status: 500 });
  }
} 