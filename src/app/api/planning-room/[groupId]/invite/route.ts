import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface RoomMember {
  userId: string;
  role: string;
}

// Simple token generator
function generateSimpleToken(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function handleInviteRequest(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  try {
    const groupId = context.params.groupId;

    if (!groupId) {
      return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
    }

    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is authorized to create invites
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isMember = room.members.some((member: RoomMember) => member.userId === token.sub);
    if (!isMember) {
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    // Generate new invite token
    const inviteToken = generateSimpleToken(32);
    const now = new Date();
    const expiresAt = new Date();

    // Store the invite token
    await prisma.inviteToken.create({
      data: {
        token: inviteToken,
        planningRoomId: groupId,
        generatedByUserId: token.sub,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        maxUses: 10,
        usesCount: 0,
        isActive: true
      }
    });

    // Return the invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

    return NextResponse.json({
      url: inviteUrl,
      token: inviteToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  return handleInviteRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  return handleInviteRequest(request, context);
} 