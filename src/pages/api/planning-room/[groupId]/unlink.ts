import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // unlink.ts is at /api/planning-room/[groupId]/unlink
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
      console.error('[UnlinkAPI] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Check if table exists
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, nothing to unlink
      console.log('[UnlinkAPI] LinkedGroup table does not exist');
      return NextResponse.json({ links: [] });
    }
    
    // Delete the link if it exists
    await db.prepare(
      `DELETE FROM LinkedGroup WHERE sourceGroupId = ? AND linkedGroupId = ?`
    ).bind(groupId, linkedGroupId).run();

    // Fetch updated list of linked groups
    const linksResult = await db.prepare(
      `SELECT * FROM LinkedGroup WHERE sourceGroupId = ?`
    ).bind(groupId).all();
    const links = linksResult.results || [];
    
    return NextResponse.json({ links });
  } catch (e: any) {
    console.error('[UnlinkAPI] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 