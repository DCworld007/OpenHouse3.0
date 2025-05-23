import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated: No token found' },
        { status: 401 }
      );
    }

    let userId;
    try {
      const { payload } = await verifyToken(token);
      userId = payload.sub;
      if (!userId) {
        throw new Error('User ID not found in token payload');
      }
    } catch (err) {
      console.error('[API GET /rooms/:roomId] Token verification error:', err);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { roomId } = params;
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const room = await prisma.planningRoom.findUnique({
      where: { id: roomId },
      include: {
        members: true,
        cards: {
          include: {
            card: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if the user is a member of the room
    const isMember = room.members.some(member => member.userId === userId);
    if (!isMember) {
      return NextResponse.json(
        { error: 'Not authorized to access this room' },
        { status: 403 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('[API GET /rooms/:roomId] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated: No token found' },
        { status: 401 }
      );
    }

    let userId;
    try {
      const { payload } = await verifyToken(token);
      userId = payload.sub;
      if (!userId) {
        throw new Error('User ID not found in token payload');
      }
    } catch (err) {
      console.error('[API PATCH /rooms] Token verification error:', err);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { roomId } = params;
    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // First check if the user has permission to update this room
    const room = await prisma.planningRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (room.ownerId !== userId && !room.members.some(m => m.userId === userId)) {
      return NextResponse.json(
        { error: 'Not authorized to update this room' },
        { status: 403 }
      );
    }

    // Update the room name
    const updatedRoom = await prisma.planningRoom.update({
      where: { id: roomId },
      data: { 
        name,
        updatedAt: new Date()
      },
    });

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('[API PATCH /rooms] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 