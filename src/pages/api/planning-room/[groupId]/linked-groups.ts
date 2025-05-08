import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // linked-groups.ts is at /api/planning-room/[groupId]/linked-groups
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
      console.error('[LinkedGroups API] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[LinkedGroups API] Creating LinkedGroup table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS LinkedGroup (
          sourceGroupId TEXT NOT NULL,
          linkedGroupId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (sourceGroupId, linkedGroupId)
        )
      `).run();
      
      // If table was just created, there are no linked groups
      return NextResponse.json({ linkedGroups: [] });
    }
    
    // Find all linked group IDs
    const linksResult = await db.prepare(
      `SELECT linkedGroupId FROM LinkedGroup WHERE sourceGroupId = ?`
    ).bind(groupId).all();
    const linkedGroupIds = (linksResult.results || []).map((l: any) => l.linkedGroupId);
    if (linkedGroupIds.length === 0) {
      return NextResponse.json({ linkedGroups: [] });
    }
    // Fetch group details and cards for each linked group
    const placeholders = linkedGroupIds.map(() => '?').join(',');
    // Get group details
    const groupsResult = await db.prepare(
      `SELECT * FROM PlanningRoom WHERE id IN (${placeholders})`
    ).bind(...linkedGroupIds).all();
    const groups = groupsResult.results || [];
    // Get cards for each group
    const groupCardLinksResult = await db.prepare(
      `SELECT crl.*, c.content, c.notes, c.cardType FROM CardRoomLink crl JOIN Card c ON crl.cardId = c.id WHERE crl.roomId IN (${placeholders})`
    ).bind(...linkedGroupIds).all();
    const cardLinks = groupCardLinksResult.results || [];
    
    return NextResponse.json({ 
      linkedGroups: groups.map((g: any) => ({
        ...g,
        cards: cardLinks.filter((cl: any) => cl.roomId === g.id)
      }))
    });
  } catch (e: any) {
    console.error('[LinkedGroups API] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 