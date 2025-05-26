import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/utils/jwt';

async function verifyJWT(token: string) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[rooms] JWT verification failed:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the JWT token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the token
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get all rooms where the user is a member
    const rooms = await prisma.planningRoom.findMany({
      where: {
        members: {
          some: {
            userId: payload.sub
          }
        }
      },
      include: {
        members: true,
        cards: {
          include: {
            card: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('[API] Error in rooms GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the JWT token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Verify the token
    const payload = await verifyJWT(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { id, name, description = '' } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[API] Creating room with ID ${id} for user ${payload.sub}`);

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      console.log(`[API] Creating user ${payload.sub} before creating room`);
      user = await prisma.user.create({
        data: {
          id: payload.sub,
          email: payload.email as string,
          name: payload.name as string,
          image: payload.picture as string | undefined,
        }
      });
    }

    // Check if room already exists
    const existingRoom = await prisma.planningRoom.findUnique({
      where: { id },
      include: { members: true }
    });

    if (existingRoom) {
      console.log(`[API] Room ${id} already exists`);
      
      // Check if user is a member
      const isMember = existingRoom.members.some(member => member.userId === payload.sub);
      if (!isMember) {
        // Add user as a member
        await prisma.planningRoom.update({
          where: { id },
          data: {
            members: {
              create: {
                userId: payload.sub,
                role: 'member'
              }
            }
          }
        });
      }
      
      return NextResponse.json(existingRoom, { status: 200 });
    }

    // Create room and add creator as owner and member
    const room = await prisma.planningRoom.create({
      data: {
        id,
        name,
        description,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner'
          }
        }
      }
    });

    console.log(`[API] Created room ${id}`);
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error('[API] Error in rooms POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 