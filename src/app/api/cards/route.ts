import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/cloudflare-jwt';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Get JWT token from request
    const token = await getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token, process.env.JWT_SECRET || '');
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = payload.sub;

    // Get D1 database from context
    const db = (req as any).cf?.env?.DB;
    if (!db) {
      throw new Error('D1 database not found in context');
    }

    const data = await req.json();
    const { content, notes, cardType, imageUrl, groupId } = data;

    // Create card
    const cardId = crypto.randomUUID();
    const now = new Date().toISOString();
    const insertStmt = db.prepare(
      'INSERT INTO Card (id, content, notes, cardType, imageUrl, groupId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    await insertStmt.bind(
      cardId,
      content,
      notes,
      cardType,
      imageUrl,
      groupId,
      userId,
      now,
      now
    ).run();

    // Fetch the created card
    const cardStmt = db.prepare('SELECT * FROM Card WHERE id = ?');
    const card = await cardStmt.bind(cardId).first();

    return NextResponse.json(card);
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Get JWT token from request
    const token = await getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token, process.env.JWT_SECRET || '');
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = payload.sub;

    // Get D1 database from context
    const db = (req as any).cf?.env?.DB;
    if (!db) {
      throw new Error('D1 database not found in context');
    }

    // Fetch user's cards
    const cardsStmt = db.prepare('SELECT * FROM Card WHERE userId = ?');
    const cards = await cardsStmt.bind(userId).all();

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
} 