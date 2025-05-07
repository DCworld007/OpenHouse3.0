import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export default async function handler(req: NextRequest, { params }: { params: { groupId: string } }) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  const groupId = params.groupId;
  const { linkedGroupId } = await req.json();
  if (!groupId || !linkedGroupId) {
    return NextResponse.json({ error: 'Missing groupId or linkedGroupId' }, { status: 400 });
  }
  try {
    // Get D1 database from context
    const db = (req as any).cf?.env?.DB;
    if (!db) {
      throw new Error('D1 database not found in context');
    }
    // Upsert: Try to insert, ignore if already exists (unique constraint)
    await db.prepare(
      `INSERT OR IGNORE INTO LinkedGroup (sourceGroupId, linkedGroupId) VALUES (?, ?)`
    ).bind(groupId, linkedGroupId).run();

    // Fetch updated list of linked groups
    const linksResult = await db.prepare(
      `SELECT * FROM LinkedGroup WHERE sourceGroupId = ?`
    ).bind(groupId).all();
    const links = linksResult.results || [];
    return NextResponse.json({ links });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 