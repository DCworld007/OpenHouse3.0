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
  // link.ts is at /api/planning-room/[groupId]/link
  const groupId = pathSegments[pathSegments.length - 2];
  
  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing groupId' }, { status: 400 });
  }
  
  try {
    // Extract linked group ID from request body
  const { linkedGroupId } = await req.json();
    if (!linkedGroupId) {
      return NextResponse.json({ error: 'Missing linkedGroupId' }, { status: 400 });
  }
    
    // Get the Cloudflare context
    const ctx = await getCloudflareContext({async: true});
    
    // Get the DB binding directly
    const db = ctx.env.DB;
    
    if (!db) {
      console.error('[LinkAPI] D1 database (DB binding) not found');
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    const now = new Date().toISOString();
    
    // Check if table exists, create if not
    try {
      await db.prepare(`SELECT * FROM LinkedGroup LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[LinkAPI] Creating LinkedGroup table');
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS LinkedGroup (
          sourceGroupId TEXT NOT NULL,
          linkedGroupId TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          PRIMARY KEY (sourceGroupId, linkedGroupId)
        )
      `).run();
    }
    
    // Check if CopiedCards table exists, create if not
    try {
      await db.prepare(`SELECT * FROM CopiedCards LIMIT 1`).all();
    } catch (e) {
      // Table doesn't exist, create it
      console.log('[LinkAPI] Creating CopiedCards table');
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
    
    // Upsert: Try to insert, ignore if already exists (unique constraint)
    await db.prepare(
      `INSERT OR IGNORE INTO LinkedGroup (sourceGroupId, linkedGroupId, createdAt) VALUES (?, ?, ?)`
    ).bind(groupId, linkedGroupId, now).run();

    console.log(`[LinkAPI] Linked group ${linkedGroupId} to source group ${groupId}`);

    // NEW: Get the linked group details and cards
    // First try to get from DB
    const linkedGroupResult = await db.prepare(
      `SELECT * FROM PlanningRoom WHERE id = ?`
    ).bind(linkedGroupId).all();
    
    let linkedGroup = null;
    if (linkedGroupResult.results && linkedGroupResult.results.length > 0) {
      linkedGroup = linkedGroupResult.results[0];
    }
    
    // Get cards for the linked group from request parameter
    const groupsParam = url.searchParams.get('groups');
    let providedGroups: any[] = [];
    let cardsToAdd: any[] = [];
    
    if (groupsParam) {
      try {
        providedGroups = JSON.parse(decodeURIComponent(groupsParam));
        console.log(`[LinkAPI] Received ${providedGroups.length} groups from request parameter`);
        
        // Find the linked group in provided groups
        const providedLinkedGroup = providedGroups.find((g: any) => g.id === linkedGroupId);
        
        if (providedLinkedGroup) {
          console.log(`[LinkAPI] Found linked group in provided groups:`, providedLinkedGroup.name);
          linkedGroup = providedLinkedGroup;
          
          // Get cards from the linked group
          const linkedGroupCards: any[] = [];
          
          // Check for cards array
          if (providedLinkedGroup.cards && Array.isArray(providedLinkedGroup.cards)) {
            console.log(`[LinkAPI] Group has ${providedLinkedGroup.cards.length} cards in 'cards' array`);
            linkedGroupCards.push(...providedLinkedGroup.cards);
          } else {
            console.log(`[LinkAPI] Group has no 'cards' array or it's not an array`);
          }
          
          // Check for listings array (which might also contain cards)
          if (providedLinkedGroup.listings && Array.isArray(providedLinkedGroup.listings)) {
            console.log(`[LinkAPI] Group has ${providedLinkedGroup.listings.length} items in 'listings' array`);
            linkedGroupCards.push(...providedLinkedGroup.listings.map((listing: any) => ({
              id: listing.id,
              content: listing.content || listing.address || '',
              notes: listing.notes || '',
              cardType: listing.cardType || listing.type || 'what',
              userId: listing.userId || 'unknown',
              createdAt: listing.createdAt || now,
              updatedAt: listing.updatedAt || now
            })));
          } else {
            console.log(`[LinkAPI] Group has no 'listings' array or it's not an array`);
          }
          
          console.log(`[LinkAPI] Total cards found in group: ${linkedGroupCards.length}`);
          
          // Prepare cards to be added to CopiedCards table
          cardsToAdd = linkedGroupCards.map((card: any) => {
            const newId = uuidv4();
            return {
              id: newId,
              groupId,
              originalId: card.id,
              originalGroupId: linkedGroupId,
              originalGroupName: providedLinkedGroup.name || 'Unnamed Group',
              content: card.content || '',
              notes: card.notes || '',
              cardType: card.cardType || 'what',
              userId: card.userId || 'unknown',
              createdAt: now,
              updatedAt: now
            };
          });
          
          console.log(`[LinkAPI] Prepared ${cardsToAdd.length} cards to copy from linked group ${linkedGroupId}`);
          if (cardsToAdd.length > 0) {
            console.log(`[LinkAPI] First card to add:`, JSON.stringify(cardsToAdd[0]));
          }
        } else {
          console.log(`[LinkAPI] Could not find linked group ${linkedGroupId} in provided groups`);
        }
      } catch (e) {
        console.error(`[LinkAPI] Error parsing groups parameter:`, e);
      }
    }
    
    // Copy cards to CopiedCards table
    if (cardsToAdd.length > 0) {
      console.log(`[LinkAPI] Adding ${cardsToAdd.length} copied cards to database`);
      
      // Use a transaction to add all cards
      for (const card of cardsToAdd) {
        await db.prepare(`
          INSERT INTO CopiedCards (
            id, groupId, originalId, originalGroupId, originalGroupName, 
            content, notes, cardType, userId, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          card.id, card.groupId, card.originalId, card.originalGroupId, card.originalGroupName,
          card.content, card.notes, card.cardType, card.userId, card.createdAt, card.updatedAt
        ).run();
      }
      
      console.log(`[LinkAPI] Successfully added ${cardsToAdd.length} copied cards to database`);
    }

    // Fetch updated list of linked groups
    const linksResult = await db.prepare(
      `SELECT * FROM LinkedGroup WHERE sourceGroupId = ?`
    ).bind(groupId).all();
    const links = linksResult.results || [];
    
    console.log(`[LinkAPI] Found ${links.length} links for source group ${groupId}:`, links);
    
    return NextResponse.json({ 
      links,
      copiedCards: cardsToAdd.length 
    });
  } catch (e: any) {
    console.error('[LinkAPI] Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 