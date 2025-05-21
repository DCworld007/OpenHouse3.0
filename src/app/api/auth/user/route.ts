import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/utils/jwt';
import { Prisma } from '@prisma/client';

async function verifyJWT(token: string) {
  try {
    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[user] JWT verification failed:', error);
    throw error;
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

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      // Create user if they don't exist
      try {
        user = await prisma.user.create({
          data: {
            id: payload.sub,
            email: payload.email as string,
            name: payload.name as string,
            image: payload.picture as string | undefined,
          }
        });
        console.log(`[API] Created user ${user.id}`);
      } catch (err) {
        const error = err as Prisma.PrismaClientKnownRequestError;
        // If creation fails due to race condition, try to fetch the user again
        if (error.code === 'P2002') {
          user = await prisma.user.findUnique({
            where: { id: payload.sub }
          });
          if (!user) {
            throw error;
          }
          console.log(`[API] User ${user.id} already exists (race condition)`);
        } else {
          throw error;
        }
      }
    } else {
      console.log(`[API] User ${user.id} already exists`);
    }
    
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('[API] Error in user POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 