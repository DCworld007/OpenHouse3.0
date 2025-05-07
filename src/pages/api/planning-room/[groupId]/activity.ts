import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const groupId = pathSegments[pathSegments.length - 2];

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }
  // Get D1 database from context
  const db = process.env.DB as any as D1Database;
  if (!db) {
    console.error('[Activity API] D1 database (DB binding) not found in process.env');
    return NextResponse.json({ error: 'D1 database (DB binding) not found in process.env' }, { status: 500 });
  }

  if (req.method === 'POST') {
    // Add activity event
    try {
      const body = await req.text();
      console.log('[Activity API] POST body:', body);
      const { id, userId, type, context, timestamp } = JSON.parse(body);
      if (!id || !userId || !type || !timestamp) {
        console.error('[Activity API] Missing required fields', { id, userId, type, timestamp });
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      await db.prepare(
        `INSERT INTO activity_log (id, groupId, userId, type, context, timestamp) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, groupId, userId, type, JSON.stringify(context || {}), timestamp).run();
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
      console.error('[Activity API] Error in POST', e);
      return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
  }

  if (req.method === 'GET') {
    // Fetch activity feed for group
    try {
      const result = await db.prepare(
        `SELECT * FROM activity_log WHERE groupId = ? ORDER BY timestamp DESC LIMIT 100`
      ).bind(groupId).all();
      const activities = (result.results || []).map((row: any) => ({
        ...row,
        context: row.context ? JSON.parse(row.context) : {},
      }));
      return NextResponse.json({ activities }, { status: 200 });
    } catch (e: any) {
      console.error('[Activity API] Error in GET', e);
      return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 