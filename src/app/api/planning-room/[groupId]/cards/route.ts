import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Simple in-memory storage for development
// In production, this would be replaced with a database
const docStorage = new Map<string, string>();

export async function GET(
  request: NextRequest
) {
  try {
    // Extract groupId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const groupId = pathParts[pathParts.indexOf('planning-room') + 1];
    
    console.log(`[API] Fetching cards for planning room ${groupId}`);
    
    // Check if we have data for this group
    const doc = docStorage.get(groupId);
    
    return NextResponse.json({ doc: doc || "" }, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
    
  } catch (error) {
    console.error('[API] Error in cards GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    // Extract groupId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const groupId = pathParts[pathParts.indexOf('planning-room') + 1];
    
    const body = await request.json();
    
    if (!body.doc) {
      return NextResponse.json(
        { error: 'Missing doc in request body' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Saving cards for planning room ${groupId}`);
    
    // Store the doc
    docStorage.set(groupId, body.doc);
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API] Error in cards POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 