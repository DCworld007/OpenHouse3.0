import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  // linked-groups.ts is at /api/planning-room/[groupId]/linked-groups
  const groupId = pathSegments[pathSegments.length - 2]; 

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }

  try {
    // Get the Cloudflare context
    const ctx = await getCloudflareContext({async: true});
    
    // Get the DB binding directly
    const db = ctx.env.DB;

    if (!db) {
      console.error('[LinkedGroups API] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[LinkedGroups API] Creating LinkedGroup table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS LinkedGroup (
          sourceGroupId TEXT NOT NULL,
          linkedGroupId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (sourceGroupId, linkedGroupId)
        )
      `).run();
      
      // If table was just created, there are no linked groups
      return NextResponse.json({ linkedGroups: [] });
    }
    
    // Also ensure CopiedCards table exists
    try {
      await db.prepare(`SELECT * FROM CopiedCards LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[LinkedGroups API] Creating CopiedCards table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS CopiedCards (
          id TEXT PRIMARY KEY,
          groupId TEXT NOT NULL,
          originalId TEXT NOT NULL,
          originalGroupId TEXT NOT NULL,
          originalGroupName TEXT NOT NULL,
          content TEXT NOT NULL,
          notes TEXT,
          cardType TEXT NOT NULL,
          userId TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `).run();
    }
    
    // Find all linked group IDs
    const linksResult = await db.prepare(
      `SELECT linkedGroupId FROM LinkedGroup WHERE sourceGroupId = ?`
    ).bind(groupId).all();
    const linkedGroupIds = (linksResult.results || []).map((l: any) => l.linkedGroupId);
    console.log(`[LinkedGroups API] Found ${linkedGroupIds.length} linked groups for ${groupId}:`, linkedGroupIds);
    
    // NEW: Fetch copied cards from the database
    const copiedCardsResult = await db.prepare(
      `SELECT * FROM CopiedCards WHERE groupId = ? ORDER BY originalGroupId, createdAt`
    ).bind(groupId).all();
    const copiedCards = copiedCardsResult.results || [];
    console.log(`[LinkedGroups API] Found ${copiedCards.length} copied cards for ${groupId}`);
    
    // If we have copied cards, log some details
    if (copiedCards.length > 0) {
      console.log(`[LinkedGroups API] First copied card:`, JSON.stringify(copiedCards[0]));
    }
    
    // Group copied cards by their original group
    const groupedCopiedCards: Record<string, any[]> = {};
    copiedCards.forEach((card: any) => {
      if (!groupedCopiedCards[card.originalGroupId]) {
        groupedCopiedCards[card.originalGroupId] = [];
      }
      groupedCopiedCards[card.originalGroupId].push(card);
    });
    
    console.log(`[LinkedGroups API] Grouped copied cards into ${Object.keys(groupedCopiedCards).length} original groups`);
    
    // Create formatted copied cards groups
    const copiedCardGroups = Object.keys(groupedCopiedCards).map(originalGroupId => {
      const cards = groupedCopiedCards[originalGroupId];
      const groupName = cards.length > 0 ? cards[0].originalGroupName : 'Unknown Group';
      
      console.log(`[LinkedGroups API] Creating copied card group for ${groupName} with ${cards.length} cards`);
      
      return {
        group: {
          id: originalGroupId,
          name: groupName,
          description: `Copied cards from ${groupName}`,
          ownerId: '',
          createdAt: cards.length > 0 ? cards[0].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isCopied: true
        },
        cards: cards.map(card => ({
          id: card.id,
          roomId: groupId,
          cardId: card.id,
          originalId: card.originalId,
          originalGroupId: card.originalGroupId,
          content: card.content,
          notes: card.notes || '',
          cardType: card.cardType,
          userId: card.userId,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          linkedFrom: card.originalGroupId,
          linkedFromName: card.originalGroupName,
          isCopied: true,
          reactions: {}
        }))
      };
    });
    
    if (linkedGroupIds.length === 0 && copiedCardGroups.length === 0) {
      console.log(`[LinkedGroups API] No linked groups or copied cards found for ${groupId}`);
      return NextResponse.json({ linkedGroups: [] });
    }
    
    // Skip traditional linked groups processing if there are none
    let formattedGroups: any[] = [];
    
    if (linkedGroupIds.length > 0) {
      // Get groups from the request context (passed from client side)
      const groupsParam = url.searchParams.get('groups');
      let providedGroups: any[] = [];
      
      if (groupsParam) {
        try {
          providedGroups = JSON.parse(decodeURIComponent(groupsParam));
          console.log(`[LinkedGroups API] Received ${providedGroups.length} groups from request parameter`);
        } catch (e) {
          console.error(`[LinkedGroups API] Error parsing groups from parameter:`, e);
        }
      }
      
      // Try to fetch group details from database first
    const placeholders = linkedGroupIds.map(() => '?').join(',');
      
    // Get group details
    const groupsResult = await db.prepare(
      `SELECT * FROM PlanningRoom WHERE id IN (${placeholders})`
    ).bind(...linkedGroupIds).all();
    const groups = groupsResult.results || [];
      console.log(`[LinkedGroups API] Found ${groups.length} group details from database:`, groups);
      
      // Combine database-retrieved groups with provided groups
      const combinedGroups = [...groups];
      
      // If we're missing any groups from the database, try to find them in the provided groups
      const dbGroupIds = new Set(groups.map((g: any) => g.id));
      const missingGroupIds = linkedGroupIds.filter(id => !dbGroupIds.has(id));
      
      if (missingGroupIds.length > 0 && providedGroups.length > 0) {
        console.log(`[LinkedGroups API] Looking for ${missingGroupIds.length} missing groups in provided groups`);
        
        // Find missing groups in provided groups
        const missingGroups = providedGroups.filter((g: any) => 
          missingGroupIds.includes(g.id)
        );
        
        if (missingGroups.length > 0) {
          console.log(`[LinkedGroups API] Found ${missingGroups.length} missing groups in provided groups`);
          combinedGroups.push(...missingGroups);
        }
      }
      
      // If we still don't have all the linked groups, we'll just proceed with what we have
      if (combinedGroups.length < linkedGroupIds.length) {
        console.log(`[LinkedGroups API] Warning: Only found ${combinedGroups.length} of ${linkedGroupIds.length} linked groups`);
      }
      
      // Now get cards for each combined group
      formattedGroups = combinedGroups.map((g: any) => {
        // Process the cards data
        let cards: any[] = [];
        
        // First look for cards in the database (if this group came from there)
        if (dbGroupIds.has(g.id)) {
          // For groups from the database, try to get cards from CardRoomLink table
          // (This would be handled later in the original code)
        }
        
        // For groups from local storage, extract cards from the provided data
        if (!dbGroupIds.has(g.id)) {
          // Try to get cards from 'cards' property
          if (g.cards && Array.isArray(g.cards)) {
            console.log(`[LinkedGroups API] Found ${g.cards.length} cards in 'cards' property for group ${g.id}`);
            cards = g.cards.map((card: any) => ({
              id: card.id,
              roomId: g.id,
              cardId: card.id,
              content: card.content,
              notes: card.notes || '',
              cardType: card.cardType || 'what',
              order: card.order || 0,
            }));
            
            // Debug: Log the first few cards to verify structure
            if (g.cards.length > 0) {
              console.log(`[LinkedGroups API] Sample card:`, JSON.stringify(g.cards[0]));
            }
          } else {
            console.log(`[LinkedGroups API] No cards array found for group ${g.id} or not an array`, g.cards);
          }
          
          // Also check for listings property (which might contain cards)
          if (g.listings && Array.isArray(g.listings)) {
            console.log(`[LinkedGroups API] Found ${g.listings.length} listings in group ${g.id}`);
            const listingCards = g.listings
              .filter((listing: any) => listing && listing.id)
              .map((listing: any) => ({
                id: listing.id,
                roomId: g.id,
                cardId: listing.id,
                content: listing.content || listing.address || '',
                notes: listing.notes || '',
                cardType: listing.cardType || listing.type || 'what',
                order: listing.order || 0,
              }));
            
            console.log(`[LinkedGroups API] Extracted ${listingCards.length} cards from listings for group ${g.id}`);
            cards = [...cards, ...listingCards];
          }
        }
        
        console.log(`[LinkedGroups API] Final card count for group ${g.id}: ${cards.length}`);
        
        // Format the group data
        return {
      group: {
        id: g.id,
            name: g.name || 'Unnamed Group',
            description: g.description || '',
            ownerId: g.ownerId || '',
            createdAt: g.createdAt || new Date().toISOString(),
            updatedAt: g.updatedAt || new Date().toISOString(),
            isLinked: true
          },
          cards
        };
      });
    }
    
    // Combine linked groups and copied card groups
    const allGroups = [...formattedGroups, ...copiedCardGroups];
    
    console.log(`[LinkedGroups API] Returning ${allGroups.length} formatted groups (${formattedGroups.length} linked, ${copiedCardGroups.length} copied)`);
    
    // Format the response to match what the UI expects
    return NextResponse.json({ 
      linkedGroups: allGroups.map(group => {
        // If this is a copied card group, cards are already formatted
        if (group.group.isCopied) {
          return group;
        }
        
        // For traditional linked groups, ensure all cards have the required fields
        const enhancedCards = group.cards.map((card: any) => ({
          id: card.id || card.cardId || `card-${Math.random().toString(36).substring(2, 9)}`,
          roomId: card.roomId || group.group.id,
          cardId: card.cardId || card.id || `card-${Math.random().toString(36).substring(2, 9)}`,
          content: card.content || '',
          notes: card.notes || '',
          cardType: card.cardType || 'what',
          order: card.order || 0,
          // Add additional fields required by the UI
          userId: card.userId || 'unknown',
          createdAt: card.createdAt || new Date().toISOString(),
          updatedAt: card.updatedAt || new Date().toISOString(),
          linkedFrom: group.group.id,
          linkedFromName: group.group.name,
          isLinked: true,
          // Ensure reaction data is available
          reactions: card.reactions || {}
        }));

        console.log(`[LinkedGroups API] Enhanced ${enhancedCards.length} cards for group ${group.group.id}`);
        if (enhancedCards.length > 0) {
          console.log(`[LinkedGroups API] Sample enhanced card:`, JSON.stringify(enhancedCards[0]));
        }

        return {
          group: group.group,
          cards: enhancedCards
        };
      })
    });
  } catch (e: any) {
    console.error('[LinkedGroups API] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 