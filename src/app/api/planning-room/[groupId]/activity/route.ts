import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

export async function GET(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  try {
    const { groupId } = context.params;

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // Get user info from NextAuth token
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get activities for the group
    const activities = await prisma.activity.findMany({
      where: {
        groupId: groupId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50 // Limit to last 50 activities
    });

    return NextResponse.json(activities);
  } catch (e: any) {
    console.error('[Activity API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { groupId: string } }
) {
  try {
    const { groupId } = context.params;

    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    // Get user info from NextAuth token
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = token.sub;

    // Parse request body
    const { type, context: activityContext } = await request.json();
    if (!type) {
      return NextResponse.json({ error: 'Missing activity type' }, { status: 400 });
    }

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        groupId,
        userId,
        type,
        context: activityContext ? JSON.stringify(activityContext) : null,
        timestamp: new Date()
      }
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (e: any) {
    console.error('[Activity API] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
} 