import { NextRequest } from 'next/server';
import { withErrorHandling, jsonResponse } from '../middleware';
import { getRooms, withFallback } from '../../cloudflare-fallback';

export const runtime = 'edge';

export const GET = withErrorHandling(async (request: NextRequest) => {
  console.log('[API Debug] GET /api/plans - Starting request');
  
  try {
    // Use the withFallback helper to safely get room data
    const rooms = await withFallback(
      async () => {
        console.log('[API Debug] Attempting to get rooms data');
        // This would typically be a database call
        // In a real implementation, replace with proper database access
        return getRooms();
      },
      [] // Empty array as fallback if database access fails
    );
    
    console.log(`[API Debug] Successfully retrieved ${rooms.length} rooms`);
    return jsonResponse(rooms);
  } catch (error) {
    console.error('[API Error] Error fetching plans:', error);
    console.error('[API Error Stack]', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a more detailed error response
    return jsonResponse({ 
      error: 'Failed to fetch plans',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
}); 