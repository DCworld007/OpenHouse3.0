// Basic handler for Cloudflare Pages assets
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    console.log(`[Workers-Site] ${request.method} ${url.pathname}`);
    
    try {
      // Check if this is an API request (handle it separately)
      if (url.pathname.startsWith('/api/')) {
        // Pass through to Functions
        return fetch(request);
      }
      
      // Handle regular page assets
      return fetch(request);
    } catch (e) {
      console.error(`[Workers-Site] Error:`, e);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}; 