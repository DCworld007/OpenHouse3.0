import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/utils/jwt';

async function verifyJWT(token: string) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[planning-room] JWT verification failed:', error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    // Get the JWT token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      console.error('[Planning Room API] No token found in cookies');
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the token
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      console.error('[Planning Room API] Invalid token payload:', payload);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    console.log('[Planning Room API] User authenticated:', payload.sub);

    // Get and validate groupId
    const { groupId } = params;
    if (!groupId) {
      console.error('[Planning Room API] Invalid or missing groupId');
      return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
    }

    console.log('[Planning Room API] Fetching room:', groupId);

    // Fetch the room with members
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        cards: {
          include: {
            card: true
          }
        }
      }
    });

    if (!room) {
      console.error(`[Planning Room API] Room not found: ${groupId}`);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user is a member
    const isMember = room.members.some(member => member.userId === payload.sub);
    if (!isMember) {
      console.error(`[Planning Room API] User ${payload.sub} is not a member of room ${groupId}`);
      return NextResponse.json({ error: 'Not authorized to access this room' }, { status: 403 });
    }

    console.log(`[Planning Room API] Found room ${room.id} with ${room.members.length} members`);

    return NextResponse.json(room);
  } catch (error) {
    console.error('[Planning Room API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 