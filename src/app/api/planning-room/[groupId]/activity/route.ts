import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  try {
    const groupId = await context.params.groupId;

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // Get the JWT token
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of the room
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some(member => member.userId === token.sub);
    if (!isMember) {
      return NextResponse.json({ error: 'Not authorized to view activity' }, { status: 403 });
    }

    // Get activity for the room
    const activity = await prisma.activity.findMany({
      where: { groupId: groupId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  try {
    const groupId = context.params.groupId;

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, details } = body;

    if (!type || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        groupId,
        userId: token.sub,
        type,
        context: JSON.stringify(details),
        timestamp: new Date()
      }
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 