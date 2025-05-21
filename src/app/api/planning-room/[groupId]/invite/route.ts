import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { getJwtSecret } from '@/utils/jwt';

export const runtime = 'nodejs';

// Generate a secure token using nanoid
function generateInviteToken() {
  return `inv_${nanoid(32)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;
    console.log('[Invite API] Starting invite generation for room:', groupId);

    if (!groupId) {
      console.error('[Invite API] Invalid or missing groupId');
      return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
    }

    // Get the JWT token from cookie - try both token names
    const token = request.cookies.get('token')?.value || request.cookies.get('auth_token')?.value;
    if (!token) {
      console.error('[Invite API] No token found in cookies');
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the token
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    if (!payload?.sub) {
      console.error('[Invite API] Invalid token payload:', payload);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const userId = payload.sub;
    console.log('[Invite API] User authenticated:', userId);

    // Check if room exists and user is a member
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { userId: userId }
        }
      }
    });

    if (!room) {
      console.error(`[Invite API] Room not found: ${groupId}`);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.members.length === 0) {
      console.error(`[Invite API] User ${userId} is not a member of room ${groupId}`);
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    // Generate invite token
    const inviteToken = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invite token
    const invite = await prisma.inviteToken.create({
      data: {
        token: inviteToken,
        planningRoomId: groupId,
        generatedByUserId: userId,
        expiresAt,
        maxUses: 10,
        usesCount: 0,
        isActive: true
      }
    });

    console.log(`[Invite API] Created invite token ${inviteToken} for room ${groupId}`);

    // Generate invite URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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