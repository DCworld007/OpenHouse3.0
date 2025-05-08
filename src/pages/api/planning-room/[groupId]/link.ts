import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // link.ts is at /api/planning-room/[groupId]/link
  const groupId = pathSegments[pathSegments.length - 2];
  
  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }
  
  try {
    // Extract linked group ID from request body
    const { linkedGroupId } = await req.json();
    if (!linkedGroupId) {
      return NextResponse.json({ error: 'Missing linkedGroupId' }, { status: 400 });
    }
    
    // Get the Cloudflare context
    const ctx = await getCloudflareContext({async: true});
    
    // Get the DB binding directly
    const db = ctx.env.DB;
    
    if (!db) {
      console.error('[LinkAPI] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    const now = new Date().toISOString();
    
    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[LinkAPI] Creating LinkedGroup table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS LinkedGroup (
          sourceGroupId TEXT NOT NULL,
          linkedGroupId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (sourceGroupId, linkedGroupId)
        )
      `).run();
    }
    
    // Upsert: Try to insert, ignore if already exists (unique constraint)
    await db.prepare(
      `INSERT OR IGNORE INTO LinkedGroup (sourceGroupId, linkedGroupId, createdAt) VALUES (?, ?, ?)`
    ).bind(groupId, linkedGroupId, now).run();

    // Fetch updated list of linked groups
    const linksResult = await db.prepare(
      `SELECT * FROM LinkedGroup WHERE sourceGroupId = ?`
    ).bind(groupId).all();
    const links = linksResult.results || [];
    
    return NextResponse.json({ links });
  } catch (e: any) {
    console.error('[LinkAPI] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 