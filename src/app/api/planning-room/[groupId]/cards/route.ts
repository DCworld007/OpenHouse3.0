import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
    
    // Get the stored state from KV store
    const state = await kv.get(`planningRoom:${groupId}:state`);
    
    return NextResponse.json({ doc: state || null });
  } catch (error) {
    console.error('[API] Error in cards GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
    const body = await request.json();
    
    if (!body.doc) {
      return NextResponse.json(
        { error: 'Missing doc in request body' },
        { status: 400 }
      );
    }
    
    // Store the state in KV store
    await kv.set(`planningRoom:${groupId}:state`, body.doc);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in cards POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 