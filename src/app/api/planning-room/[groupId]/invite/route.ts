import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple token generator
function generateSimpleToken(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  try {
    const groupId = context.params.groupId;

    if (!groupId) {
      return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
    }

    // Get user info from JWT token
    const cookie = request.cookies.get('token')?.value;
    let userId = null;

    if (cookie) {
      try {
        const parts = cookie.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          userId = payload.sub;
        }
      } catch (e) {
        console.error('[API Invite] Error parsing token:', e);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is room owner
    const room = await prisma.planningRoom.findUnique({
      where: { id: groupId },
      select: { ownerId: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.ownerId !== userId) {
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    // Generate new invite token
    const token = generateSimpleToken(32);
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update room with new invite token
    await prisma.planningRoom.update({
      where: { id: groupId },
      data: { 
        inviteToken: token,
        shareable: true
      }
    });

    // Get base URL from environment
    const requestHost = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = requestHost ? `${protocol}://${requestHost}` : process.env.VERCEL_URL || 'http://localhost:3000';
    const inviteUrl = new URL('/invite', baseUrl);
    inviteUrl.searchParams.set('token', token);

    return NextResponse.json({
      token,
      inviteUrl: inviteUrl.toString(),
      expiresAt: expiresAt.toISOString()
    });
  } catch (e: any) {
    console.error('[API Invite] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  return GET(request, context);
} 