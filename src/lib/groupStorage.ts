// Centralized group storage utility for robust, extensible persistence
// Supports both client-side (localStorage) and server-side (Cloudflare KV) storage

const STORAGE_KEY = 'openhouse-data';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export function getGroups(): any[] {
  if (!isBrowser) {
    // Return empty array for server-side rendering
    return [];
  }
  
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
  if (!isBrowser) {
    // Skip saving for server-side rendering
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (e) {
    console.error('[groupStorage] Error saving groups:', e);
  }
}

export function deleteGroup(groupId: string): void {
  if (!isBrowser) {
    // Skip deleting for server-side rendering
    return;
  }
  
  const groups = getGroups();
  const newGroups = groups.filter(g => g.id !== groupId);
  saveGroups(newGroups);
}

// Migrate legacy data structures to current format
function migrateGroups(groups: any[]): any[] {
  // If not an array, return empty array
  if (!Array.isArray(groups)) return [];
  
  return groups.map(group => {
    // Ensure required fields
    if (!group.id) group.id = generateId();
    if (!group.name) group.name = 'Untitled Group';
    if (!group.cards) group.cards = [];
    
    return group;
  });
}

// Generate unique ID helper
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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