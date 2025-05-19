import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

// Generate a secure token using nanoid
function generateInviteToken() {
  return `inv_${nanoid(32)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    // Get the groupId from params
    const groupId = params.groupId;
    if (!groupId) {
      return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
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
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    // Generate invite token
    const inviteToken = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invite token record
    await prisma.inviteToken.create({
      data: {
        token: inviteToken,
        planningRoomId: groupId,
        generatedByUserId: token.sub,
        expiresAt,
        maxUses: 10,
        usesCount: 0,
        isActive: true
      }
    });

    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

    return NextResponse.json({
      url: inviteUrl,
      token: inviteToken,
      expiresAt: expiresAt.toISOString(),
      maxUses: 10
    });
  } catch (error) {
    console.error('[Invite API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  return POST(request, { params });
} 