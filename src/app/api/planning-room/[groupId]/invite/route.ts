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

async function verifyJWT(token: string) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[invite] JWT verification failed:', error);
    throw error;
  }
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
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      console.error('[Invite API] Invalid token payload:', payload);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    console.log('[Invite API] User authenticated:', payload.sub);

    // Check if user is a member of the room
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: { members: true }
    });

    if (!room) {
      console.error(`[Invite API] Room not found: ${groupId}`);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log('[Invite API] Room found:', room.id);
    console.log('[Invite API] Room members:', room.members);

    const isMember = room.members.some(member => member.userId === payload.sub);
    if (!isMember) {
      console.error(`[Invite API] User ${payload.sub} is not a member of room ${groupId}`);
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    // Generate invite token
    const inviteToken = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invite token record
    const invite = await prisma.inviteToken.create({
      data: {
        token: inviteToken,
        planningRoomId: groupId,
        generatedByUserId: payload.sub,
        expiresAt,
        maxUses: 10,
        usesCount: 0,
        isActive: true
      }
    });

    console.log(`[Invite API] Created invite token ${inviteToken} for room ${groupId}`);

    // Generate invite URL using environment variables
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