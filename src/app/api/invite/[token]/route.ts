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
    console.error('[Invite API] Auth verification error:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { token: string } }
) {
  try {
    const { token } = context.params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Find the invite token with room details
    const inviteToken = await prisma.inviteToken.findUnique({
      where: { token },
      include: { 
        planningRoom: {
          select: {
            id: true,
            name: true,
            description: true,
            members: {
              select: {
                userId: true,
                role: true
              }
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

    // Check if the user is already a member
    const user = await verifyAuth(request);
    if (user) {
      const isMember = inviteToken.planningRoom.members.some(member => member.userId === user.id);
      if (isMember) {
        return NextResponse.json({ error: 'You are already a member of this room' }, { status: 400 });
      }
    }

    return NextResponse.json({
      roomId: inviteToken.planningRoomId,
      roomName: inviteToken.planningRoom.name,
      roomDescription: inviteToken.planningRoom.description,
      expiresAt,
      remainingUses: maxUses - inviteToken.usesCount
    });
  } catch (error) {
    console.error('[Invite API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 