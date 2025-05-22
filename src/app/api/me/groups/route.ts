import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { prisma } from '@/lib/prisma'; // Assuming prisma client is exported from here

export const runtime = 'edge'; // Or remove if not using edge runtime

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'Not authenticated: No token found' },
        { status: 401 }
      );
    }

    let userId;
    try {
      const { payload } = await verifyToken(token);
      userId = payload.sub; // Assuming 'sub' is the user ID in the token
      if (!userId) {
        throw new Error('User ID not found in token payload');
      }
    } catch (err) {
      console.error('[API /me/groups] Token verification error:', err);
      return NextResponse.json(
        { authenticated: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const planningRoomsFromDb = await prisma.planningRoom.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        cards: { // This is CardRoomLink[]
          include: {
            card: true, // This includes the actual Card data
          },
          orderBy: { 
            // If you have an order field on CardRoomLink or Card, you can use it here
            // For example, if CardRoomLink has 'createdAt' or an 'order' field:
            // createdAt: 'asc', 
          }
        },
        // Potentially include other relations like members if needed for the 'Plans' page overview
        // _count: {
        //   select: { members: true },
        // }
      },
      orderBy: {
        createdAt: 'desc', // Or by 'name', 'updatedAt', etc.
      }
    });

    // Transform the data to match the frontend Group/Card structure if needed
    // The frontend 'Group' interface seems to have `cards: Card[]`
    // The frontend 'Card' interface has id, type, content, notes
    const groups = planningRoomsFromDb.map(room => {
      const frontendCards = room.cards.map(cardLink => {
        // Map prisma Card to frontend Card interface
        return {
          id: cardLink.card.id,
          type: cardLink.card.type, // Ensure 'type' exists on Card model
          content: cardLink.card.content,
          notes: cardLink.card.notes,
          // Add any other fields expected by the frontend Card type
          // lat: cardLink.card.lat, // Example if you add geo data
          // lng: cardLink.card.lng, // Example
        };
      });

      return {
        id: room.id,
        name: room.name,
        description: room.description,
        // ownerId: room.ownerId, // Usually not needed on frontend if it's "my" groups
        // memberCount: room._count?.members, // Example
        cards: frontendCards,
        // Add any other fields expected by the frontend Group type
        // listings: frontendCards.map(fc => ({ ...fc, groupId: room.id, ...otherListingDefaults })), // If listings are derived from cards
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });

    return NextResponse.json({ authenticated: true, groups });

  } catch (e: any) {
    console.error('[API /me/groups] Error:', e);
    return NextResponse.json(
      { authenticated: false, error: e.message || 'Server error fetching groups' },
      { status: 500 }
    );
  }
} 