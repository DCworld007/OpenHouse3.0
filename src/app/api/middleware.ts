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
      
      console.log(`[API Debug] Request to ${request.url}, isCloudflare: ${isCloudflare}`);
      
      // Add Cloudflare detection to the request context
      const context = {
        isCloudflare,
        ...env
      };
      
      // Execute the handler
      return await handler(request, context);
    } catch (error) {
      console.error('API error:', error);
      
      // Enhanced error logging
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cloudflare: shouldUseFallback(),
        url: request.url,
        method: request.method
      };
      
      console.error('[API Detailed Error]', JSON.stringify(errorDetails, null, 2));
      
      // Return a formatted error response
      return NextResponse.json({
        error: 'An internal server error occurred',
        message: errorDetails.message,
        cloudflare: shouldUseFallback(),
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
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