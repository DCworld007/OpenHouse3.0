import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Simple in-memory storage for development
// In production, this would be replaced with a database
const rooms = new Map<string, { id: string; name: string; description: string }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name' },
        { status: 400 }
      );
    }
    
    const { id, name, description = '' } = body;
    
    // Check if room already exists
    if (rooms.has(id)) {
      console.log(`[API] Room ${id} already exists`);
      return NextResponse.json(
        { success: true, message: 'Room already exists', roomId: id },
        { status: 200 }
      );
    }
    
    // Store room
    rooms.set(id, { id, name, description });
    console.log(`[API] Created room ${id}`);
    
    return NextResponse.json(
      { success: true, id },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API] Error in rooms POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 