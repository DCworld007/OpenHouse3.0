import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/utils/jwt';
import { Card, CardRoomLink, Prisma } from '@prisma/client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get('token')?.value || 
                request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  try {
    const { payload } = await verifyToken(token);
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
  } catch (err) {
    console.error('[API] Token verification error:', err);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
    
    // Get all cards for this room
    const cards = await prisma.cardRoomLink.findMany({
      where: {
        roomId: groupId
      },
      include: {
        card: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Format the response to match the expected structure
    const state = {
      linkedCards: cards.map(link => ({
        id: link.card.id,
        type: link.card.type,
        content: link.card.content,
        notes: link.card.notes,
        createdAt: link.card.createdAt,
        updatedAt: link.card.updatedAt,
        createdById: link.card.createdById
      })),
      cardOrder: cards.map(link => link.card.id)
    };
    
    return NextResponse.json({ doc: state });
  } catch (error) {
    console.error('[API] Error in cards GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
    const body = await request.json();
    
    if (!body.doc) {
      return NextResponse.json(
        { error: 'Missing doc in request body' },
        { status: 400 }
      );
    }

    // Get the current user
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { linkedCards, cardOrder } = body.doc;

    // Start a transaction to update cards
    await prisma.$transaction(async (tx) => {
      // First, remove all existing card links for this room
      await tx.cardRoomLink.deleteMany({
        where: {
          roomId: groupId
        }
      });

      // Then create new cards and links in the correct order
      for (let i = 0; i < linkedCards.length; i++) {
        const cardData = linkedCards[i];

        // Create or update the card with proper types
        const createInput: Prisma.CardCreateInput = {
          type: cardData.type || 'what',
          content: cardData.content || '',
          notes: cardData.notes || '',
          createdBy: {
            connect: { id: user.id }
          },
          rooms: {
            create: {
              roomId: groupId
            }
          }
        };

        const updateInput: Prisma.CardUpdateInput = {
          type: cardData.type || 'what',
          content: cardData.content || '',
          notes: cardData.notes || '',
          rooms: {
            create: {
              roomId: groupId
            }
          }
        };

        await tx.card.upsert({
          where: {
            id: cardData.id
          },
          create: createInput,
          update: updateInput
        });
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in cards POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 