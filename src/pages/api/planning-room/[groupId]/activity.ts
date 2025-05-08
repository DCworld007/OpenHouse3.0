import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const groupId = pathSegments[pathSegments.length - 2];

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }
  
  try {
    // Get the Cloudflare context
    const ctx = await getCloudflareContext({async: true});
    
    // Get the DB binding directly
    const db = ctx.env.DB;
    
    if (!db) {
      console.error('[Activity API] D1 database (DB binding) not found after trying all methods');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM Activity LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[Activity API] Creating Activity table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS Activity (
          id TEXT PRIMARY KEY,
          groupId TEXT NOT NULL,
          userId TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          createdAt TEXT NOT NULL
        )
      `).run();
      
      // If table was just created, there are no activities
      return NextResponse.json({ activities: [] });
    }
    
    // Get latest activities for group
    const result = await db.prepare(
      `SELECT a.*, u.name as userName, u.email as userEmail, u.image as userImage 
      FROM Activity a
      LEFT JOIN User u ON a.userId = u.id
      WHERE a.groupId = ?
      ORDER BY a.createdAt DESC
      LIMIT 50`
    ).bind(groupId).all();
    
    const activities = result.results || [];
    
    return NextResponse.json({ activities });
  } catch (e: any) {
    console.error('[Activity API] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 