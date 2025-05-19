import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

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

    // Get user info from NextAuth token
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = token.sub;

    // Check if user is room owner or member
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: userId },
          select: { role: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const userMembership = room.members[0];
    if (!userMembership || (userMembership.role !== 'owner' && userMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    // Generate new invite token
    const token = generateSimpleToken(32);
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    // Create invite token in database
    const invite = await prisma.inviteToken.create({
      data: {
        token: token,
        planningRoomId: groupId,
        generatedByUserId: userId,
        expiresAt: expiresAt,
        maxUses: 10, // Default to 10 uses
        usesCount: 0,
        isActive: true
      }
    });

    // Get base URL from environment or request
    const requestHost = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = requestHost ? `${protocol}://${requestHost}` : process.env.VERCEL_URL || 'http://localhost:3000';
    const inviteUrl = new URL('/invite', baseUrl);
    inviteUrl.searchParams.set('token', token);

    return NextResponse.json({
      token,
      inviteUrl: inviteUrl.toString(),
      expiresAt: expiresAt.toISOString(),
      maxUses: invite.maxUses,
      usesCount: invite.usesCount
    });
  } catch (e: any) {
    console.error('[API Invite] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal Server Error' },
      { status: 500 }
    );
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