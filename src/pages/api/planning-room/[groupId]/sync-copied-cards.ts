import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // sync-copied-cards.ts is at /api/planning-room/[groupId]/sync-copied-cards
  const groupId = pathSegments[pathSegments.length - 2];
  
  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }
  
  try {
    // Get the request data
    const { originalGroupId, originalGroup } = await req.json();
    
    if (!originalGroupId) {
      return NextResponse.json({ error: 'Missing originalGroupId' }, { status: 400 });
    }
    
    if (!originalGroup) {
      return NextResponse.json({ error: 'Missing originalGroup data' }, { status: 400 });
    }
    
    // Get the Cloudflare context
    const ctx = await getCloudflareContext({async: true});
    
    // Get the DB binding directly
    const db = ctx.env.DB;
    
    if (!db) {
      console.error('[SyncAPI] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Find all copied cards from this original group
    const copiedCardsResult = await db.prepare(
      `SELECT * FROM CopiedCards WHERE groupId = ? AND originalGroupId = ?`
    ).bind(groupId, originalGroupId).all();
    
    const copiedCards = copiedCardsResult.results || [];
    console.log(`[SyncAPI] Found ${copiedCards.length} copied cards from original group ${originalGroupId}`);
    
    if (copiedCards.length === 0) {
      return NextResponse.json({ 
        message: 'No copied cards found to sync',
        syncedCount: 0 
      });
    }
    
    // Create a map of originalId to copied card for quick lookup
    const copiedCardsMap = new Map();
    copiedCards.forEach((card: any) => {
      copiedCardsMap.set(card.originalId, card);
    });
    
    // Extract original cards from the originalGroup data
    const originalCards: any[] = [];
    
    // Check for cards array
    if (originalGroup.cards && Array.isArray(originalGroup.cards)) {
      originalCards.push(...originalGroup.cards);
    }
    
    // Check for listings array (which might also contain cards)
    if (originalGroup.listings && Array.isArray(originalGroup.listings)) {
      originalCards.push(...originalGroup.listings.map((listing: any) => ({
        id: listing.id,
        content: listing.content || listing.address || '',
        notes: listing.notes || '',
        cardType: listing.cardType || listing.type || 'what',
        userId: listing.userId || 'unknown',
        createdAt: listing.createdAt || new Date().toISOString(),
        updatedAt: listing.updatedAt || new Date().toISOString()
      })));
    }
    
    console.log(`[SyncAPI] Found ${originalCards.length} original cards in group ${originalGroupId}`);
    
    // If no original cards, return early
    if (originalCards.length === 0) {
      return NextResponse.json({ 
        message: 'No original cards found to sync from',
        syncedCount: 0 
      });
    }
    
    // Find cards that need updating
    const cardsToUpdate: any[] = [];
    const cardsToAdd: any[] = [];
    const now = new Date().toISOString();
    
    // Process each original card
    originalCards.forEach((originalCard: any) => {
      if (!originalCard.id) return;
      
      const copiedCard = copiedCardsMap.get(originalCard.id);
      
      if (copiedCard) {
        // Card already exists as a copy, check if it needs updating
        if (originalCard.content !== copiedCard.content || 
            originalCard.notes !== copiedCard.notes || 
            originalCard.cardType !== copiedCard.cardType) {
          // Card has changed, update it
          cardsToUpdate.push({
            id: copiedCard.id,
            originalId: originalCard.id,
            content: originalCard.content || '',
            notes: originalCard.notes || '',
            cardType: originalCard.cardType || 'what',
            updatedAt: now
          });
        }
      } else {
        // This is a new card in the original group, create a new copy
        cardsToAdd.push({
          id: uuidv4(),
          groupId,
          originalId: originalCard.id,
          originalGroupId,
          originalGroupName: originalGroup.name || 'Unnamed Group',
          content: originalCard.content || '',
          notes: originalCard.notes || '',
          cardType: originalCard.cardType || 'what',
          userId: originalCard.userId || 'unknown',
          createdAt: now,
          updatedAt: now
        });
      }
    });
    
    console.log(`[SyncAPI] Found ${cardsToUpdate.length} cards to update and ${cardsToAdd.length} new cards to add`);
    
    // Update existing cards
    for (const card of cardsToUpdate) {
      await db.prepare(`
        UPDATE CopiedCards 
        SET content = ?, notes = ?, cardType = ?, updatedAt = ?
        WHERE id = ?
      `).bind(
        card.content, 
        card.notes, 
        card.cardType, 
        card.updatedAt,
        card.id
      ).run();
    }
    
    // Add new cards
    for (const card of cardsToAdd) {
      await db.prepare(`
        INSERT INTO CopiedCards (
          id, groupId, originalId, originalGroupId, originalGroupName, 
          content, notes, cardType, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        card.id, 
        card.groupId, 
        card.originalId, 
        card.originalGroupId, 
        card.originalGroupName,
        card.content, 
        card.notes, 
        card.cardType, 
        card.userId, 
        card.createdAt, 
        card.updatedAt
      ).run();
    }
    
    // Return success
    return NextResponse.json({ 
      message: 'Cards synced successfully',
      syncedCount: cardsToUpdate.length + cardsToAdd.length,
      updated: cardsToUpdate.length,
      added: cardsToAdd.length
    });
    
  } catch (e: any) {
    console.error('[SyncAPI] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
