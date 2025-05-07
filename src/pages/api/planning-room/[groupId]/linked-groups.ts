import { NextRequest, NextResponse } from 'next/server';

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
    // Get D1 database from context
    const db = process.env.DB as any as D1Database;
    if (!db) {
      console.error('[LinkedGroups API] D1 database (DB binding) not found in process.env');
      return NextResponse.json({ error: 'D1 database (DB binding) not found in process.env' }, { status: 500 });
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
    // Format as [{ group, cards }]
    const result = groups.map((g: any) => ({
      group: {
        id: g.id,
        name: g.name,
        description: g.description,
        shareable: 'shareable' in g ? g.shareable : false,
      },
      cards: cardLinks.filter((cl: any) => cl.roomId === g.id).map((cl: any) => ({
        id: cl.cardId,
        content: cl.content,
        notes: cl.notes,
        cardType: cl.cardType,
      })),
    }));
    return NextResponse.json({ linkedGroups: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 