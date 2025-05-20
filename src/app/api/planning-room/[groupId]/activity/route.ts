import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/utils/jwt';

async function verifyJWT(token: string) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[activity] JWT verification failed:', error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = await Promise.resolve(params.groupId);

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // Get the JWT token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the token
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is a member of the room
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some(member => member.userId === payload.sub);
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
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = await Promise.resolve(params.groupId);

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // Get the JWT token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the token
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { type, details } = body;

    if (!type || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        groupId,
        userId: payload.sub,
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