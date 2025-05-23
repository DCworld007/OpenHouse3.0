import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/utils/jwt';
import { Prisma } from '@prisma/client';

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

    const user = await verifyAuth(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inviteTokenData = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        planningRoom: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    if (!inviteTokenData) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }
    if (!inviteTokenData.isActive) {
      return NextResponse.json({ error: 'This invite link is no longer active' }, { status: 400 });
    }
    const expiresAt = inviteTokenData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 });
    }
    
    const maxUses = inviteTokenData.maxUses || 10;
    if (inviteTokenData.usesCount >= maxUses) {
      const roomForMaxUsesCheck = await prisma.planningRoom.findUnique({
        where: { id: inviteTokenData.planningRoomId },
        select: { members: { where: { userId: user.id }, select: { userId: true } } }
      });
      const isAlreadyMember = roomForMaxUsesCheck && roomForMaxUsesCheck.members.length > 0;
      if (!isAlreadyMember) {
        return NextResponse.json({ error: 'This invite link has reached its maximum uses for new members.' }, { status: 400 });
      }
    }

    let isMember = false;
    let memberRole = 'MEMBER';

    const roomWithSpecificMember = await prisma.planningRoom.findUnique({
      where: { id: inviteTokenData.planningRoomId },
      select: {
        members: {
          where: { userId: user.id },
          select: { role: true }
        }
      }
    });

    if (roomWithSpecificMember && roomWithSpecificMember.members.length > 0) {
      isMember = true;
      memberRole = roomWithSpecificMember.members[0]?.role || 'MEMBER';
    }

    let joinedNew = false;
    if (!isMember) {
      await prisma.$transaction(async (tx) => {
        await tx.planningRoom.update({
          where: { id: inviteTokenData.planningRoomId },
          data: {
            members: {
              create: {
                userId: user.id,
                role: 'MEMBER',
              }
            }
          }
        });
        await tx.inviteToken.update({
          where: { token: token },
          data: { usesCount: { increment: 1 } },
        });
      });
      joinedNew = true;
      memberRole = 'MEMBER';
    }

    return NextResponse.json({
      room: {
        id: inviteTokenData.planningRoomId,
        name: inviteTokenData.planningRoom.name,
        description: inviteTokenData.planningRoom.description || '',
        role: memberRole,
        joinedNow: joinedNew,
        alreadyMember: isMember
      }
    });

  } catch (error) {
    console.error('[Join API] Error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[Join API] Prisma Error Code:', error.code, error.message);
    }
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
} 