import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: { token: string } }
) {
  try {
    const { token } = context.params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Get the JWT token
    const jwtToken = await getToken({ req: request });
    if (!jwtToken?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and validate the invite token
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: { planningRoom: true }
    });

    if (!inviteToken) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    // Check if token is active
    if (!inviteToken.isActive) {
      return NextResponse.json({ error: 'This invite link is no longer active' }, { status: 400 });
    }

    // Check if token has expired
    const expiresAt = inviteToken.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 });
    }

    // Check if max uses reached
    const maxUses = inviteToken.maxUses || 10;
    if (inviteToken.usesCount >= maxUses) {
      return NextResponse.json({ error: 'This invite link has reached its maximum uses' }, { status: 400 });
    }

    // Check if user is already a member
    const existingMember = await prisma.planningRoom.findFirst({
      where: {
        id: inviteToken.planningRoomId,
        members: {
          some: {
            userId: jwtToken.sub
          }
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this room' }, { status: 400 });
    }

    // Add user as member and increment uses count in a transaction
    await prisma.$transaction([
      prisma.planningRoom.update({
        where: { id: inviteToken.planningRoomId },
        data: {
          members: {
            create: {
              userId: jwtToken.sub,
              role: 'MEMBER'
            }
          }
        }
      }),
      prisma.inviteToken.update({
        where: { token },
        data: {
          usesCount: { increment: 1 }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      roomId: inviteToken.planningRoomId,
      roomName: inviteToken.planningRoom.name
    });
  } catch (error) {
    console.error('[Invite Join API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 