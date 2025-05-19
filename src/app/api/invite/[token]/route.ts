import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Find the invite token
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

    return NextResponse.json({
      roomId: inviteToken.planningRoomId,
      roomName: inviteToken.planningRoom.name,
      expiresAt,
      remainingUses: maxUses - inviteToken.usesCount
    });
  } catch (error) {
    console.error('[Invite Validation API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 