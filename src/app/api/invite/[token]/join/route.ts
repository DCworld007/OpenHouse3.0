import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/utils/jwt';

export const runtime = 'nodejs';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;
  if (!token) {
    return null;
  }

  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload?.sub ? { id: payload.sub } : null;
  } catch (error) {
    console.error('[Join API] Auth verification error:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { token: string } }
) {
  try {
    const { token } = context.params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and validate the invite token with room details
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        planningRoom: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
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
    if (inviteToken.planningRoom.members.length > 0) {
      return NextResponse.json({ error: 'You are already a member of this room' }, { status: 400 });
    }

    try {
      // Add user as member and increment uses count in a transaction
      const result = await prisma.$transaction([
        prisma.planningRoom.update({
          where: { id: inviteToken.planningRoomId },
          data: {
            members: {
              create: {
                userId: user.id,
                role: 'MEMBER'
              }
            }
          },
          include: {
            members: {
              where: { userId: user.id },
              select: { role: true }
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

      const [updatedRoom] = result;

      return NextResponse.json({
        success: true,
        roomId: updatedRoom.id,
        roomName: updatedRoom.name,
        role: updatedRoom.members[0]?.role || 'MEMBER'
      });
    } catch (transactionError) {
      console.error('[Join API] Transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to join room. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Join API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 