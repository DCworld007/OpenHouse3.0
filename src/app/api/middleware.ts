import { NextRequest, NextResponse } from 'next/server';
import { shouldUseFallback } from '../cloudflare-fallback';

/**
 * Wraps an API handler with error handling and Cloudflare compatibility
 */
export function withErrorHandling(handler: (req: NextRequest, env: any) => Promise<Response>) {
  return async (request: NextRequest, env: any) => {
    try {
      // Check if we're in Cloudflare Pages
      const isCloudflare = shouldUseFallback();
      
      // Add Cloudflare detection to the request context
      const context = {
        isCloudflare,
        ...env
      };
      
      // Execute the handler
      return await handler(request, context);
    } catch (error) {
      console.error('API error:', error);
      
      // Return a formatted error response
      return NextResponse.json({
        error: 'An internal server error occurred',
        message: error instanceof Error ? error.message : 'Unknown error',
        cloudflare: shouldUseFallback()
      }, { status: 500 });
    }
  };
}

/**
 * Formats an API success response
 */
export function jsonResponse(data: any, status = 200) {
  return NextResponse.json({
    success: true,
    cloudflare: shouldUseFallback(),
    data
  }, { status });
} 