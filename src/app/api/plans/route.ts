import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '../middleware';
import { getRooms, withFallback } from '../../cloudflare-fallback';

export const runtime = 'edge';

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // Use the withFallback helper to safely get room data
    const rooms = await withFallback(
      async () => {
        // This would typically be a database call
        // In a real implementation, replace with proper database access
        return getRooms();
      },
      [] // Empty array as fallback if database access fails
    );
    
    return jsonResponse(rooms);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return jsonResponse({ error: 'Failed to fetch plans' }, 500);
  }
}); 