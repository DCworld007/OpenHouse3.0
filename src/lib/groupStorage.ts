// Centralized group storage utility for robust, extensible persistence
// Supports future fields (reactions, chats, etc.)

const STORAGE_KEY = 'openhouse-data';

export function getGroups(): any[] {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) return [];
  try {
    const groups = JSON.parse(savedData);
    return migrateGroups(groups);
  } catch (e) {
    console.error('[groupStorage] Error parsing groups:', e);
    return [];
  }
}

export function saveGroups(groups: any[]): void {
  const synced = syncListingsWithCards(groups);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  console.log('[groupStorage] Saved groups:', synced);
}

export function syncListingsWithCards(groups: any[]): any[] {
  return groups.map((group: any) => {
    // Always preserve all other fields (future-proof)
    const cards = Array.isArray(group.cards) ? group.cards : [];
    return {
      ...group,
      cards,
      listings: cards.map((card: any) => ({
        id: card.id,
        address: card.content,
        cardType: card.type,
        groupId: group.id,
        imageUrl: card.type === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
        sourceUrl: '',
        source: 'manual',
        price: 0,
        notes: card.notes,
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
        reactions: card.reactions || [],
        lat: card.lat,
        lng: card.lng
      }))
    };
  });
}

// Migration: ensure all groups have cards and listings in sync
export function migrateGroups(groups: any[]): any[] {
  return groups.map((group: any) => {
    let cards = group.cards;
    if (!cards && group.listings) {
      // Convert listings to cards
      cards = group.listings.map((listing: any) => ({
        id: listing.id,
        type: listing.cardType,
        content: listing.address,
        notes: listing.notes,
        lat: listing.lat,
        lng: listing.lng,
        reactions: listing.reactions || [],
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      }));
    }
    // Always sync listings from cards
    return {
      ...group,
      cards: cards || [],
      listings: (cards || []).map((card: any) => ({
        id: card.id,
        address: card.content,
        cardType: card.type,
        groupId: group.id,
        imageUrl: card.type === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
        sourceUrl: '',
        source: 'manual',
        price: 0,
        notes: card.notes,
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
        reactions: card.reactions || [],
        lat: card.lat,
        lng: card.lng
      }))
    };
  });
} 