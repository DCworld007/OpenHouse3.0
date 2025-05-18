import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { groupId } = req.nextUrl.pathname.match(/\/api\/planning-room\/([^\/]+)\/unlink/)?.groups || {};
    
    if (!groupId) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const body = await req.json();
    const { linkedGroupId } = body;

    if (!linkedGroupId) {
      return NextResponse.json({ error: 'Missing linkedGroupId' }, { status: 400 });
    }

    // Process unlink request here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unlink:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 