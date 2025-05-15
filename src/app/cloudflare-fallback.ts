/**
 * CloudFlare Fallback Implementation
 * 
 * This module provides fallback implementations for data operations
 * when running in Cloudflare Pages where database connections might fail.
 */

// Types for the fallback data
export interface PlanningRoom {
  id: string;
  name: string;
  createdAt: string;
  userId?: string;
}

// Mock data to use when database isn't accessible
const MOCK_ROOMS: PlanningRoom[] = [
  {
    id: 'demo-room-1',
    name: 'Demo Planning Room',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-room-2',
    name: 'Sample Project Plan',
    createdAt: new Date().toISOString(),
  }
];

export interface Card {
  id: string;
  type: string;
  content: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  order?: number;
  lat?: number;
  lng?: number;
}

const MOCK_CARDS: Record<string, Card[]> = {
  'demo-room-1': [
    {
      id: 'card-1',
      type: 'where',
      content: 'Toronto',
      groupId: 'demo-room-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lat: 43.651070,
      lng: -79.347015,
    },
    {
      id: 'card-2',
      type: 'where',
      content: 'Montreal',
      groupId: 'demo-room-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lat: 45.508888,
      lng: -73.561668,
    }
  ]
};

/**
 * Checks if we need to use fallback data (typically in Cloudflare)
 */
export function shouldUseFallback(): boolean {
  let result = false;
  const reasons = [];

  if (typeof window !== 'undefined') {
    // Client-side detection
    if (window.location.hostname.includes('pages.dev')) {
      result = true;
      reasons.push('hostname includes pages.dev');
    }
    
    // Check for special debug flag in localStorage
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debug_cloudflare') === 'true') {
      result = true;
      reasons.push('debug_cloudflare=true in localStorage');
    }
  } else {
    // Server-side detection
    if (process.env.NODE_ENV === 'production' && 
        (process.env.CLOUDFLARE === 'true' || !!process.env.CF_PAGES)) {
      result = true;
      if (process.env.CLOUDFLARE === 'true') reasons.push('CLOUDFLARE=true');
      if (process.env.CF_PAGES) reasons.push('CF_PAGES is set');
    }
    
    // Local dev environment can simulate Cloudflare
    if (process.env.CLOUDFLARE === 'true' || process.env.CF_PAGES) {
      result = true;
      reasons.push('Local dev with CLOUDFLARE or CF_PAGES env var');
    }
  }
  
  if (result) {
    console.log(`[Cloudflare Fallback] Using fallback mode. Reasons: ${reasons.join(', ')}`);
  }
  
  return result;
}

/**
 * Gets room data, using fallbacks when necessary
 */
export async function getRooms(): Promise<PlanningRoom[]> {
  if (shouldUseFallback()) {
    console.log('[Cloudflare Fallback] Using mock rooms data');
    return MOCK_ROOMS;
  }
  
  // In non-fallback cases, the real data fetching would happen here
  throw new Error('Not implemented - use real data fetcher');
}

/**
 * Gets cards for a room, using fallbacks when necessary
 */
export async function getCards(roomId: string): Promise<Card[]> {
  if (shouldUseFallback()) {
    console.log(`[Cloudflare Fallback] Using mock cards data for room ${roomId}`);
    return MOCK_CARDS[roomId] || [];
  }
  
  // In non-fallback cases, the real data fetching would happen here
  throw new Error('Not implemented - use real data fetcher');
}

/**
 * Wraps database operations to use fallbacks when necessary
 * @param operation The database operation to perform
 * @param fallback Fallback data to use if operation fails
 */
export async function withFallback<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (shouldUseFallback()) {
      console.log('[Cloudflare Fallback] Using fallback data directly');
      return fallback;
    }
    
    console.log('[Database] Attempting database operation');
    return await operation();
  } catch (error) {
    console.error('[Database] Operation failed, using fallback data:', error);
    return fallback;
  }
} 