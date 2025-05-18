import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { groupId } = req.nextUrl.pathname.match(/\/api\/planning-room\/([^\/]+)\/sync-copied-cards/)?.groups || {};
    
    if (!groupId) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const body = await req.json();
    const { sourceGroupId, cards } = body;

    if (!sourceGroupId || !cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Process cards here
    const processedCards = cards.map(card => ({
      ...card,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    return NextResponse.json({ success: true, cards: processedCards });
  } catch (error) {
    console.error('Error in sync-copied-cards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
