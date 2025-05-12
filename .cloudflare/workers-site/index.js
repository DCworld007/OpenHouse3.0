import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * The DEBUG flag will do two things:
 * 1. Add a header to the response so the browser knows to use the client-side router
 * 2. Skip loading /index.html files as this will lead to directory listing
 */
const DEBUG = false;

addEventListener('fetch', (event) => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  try {
    // Get the asset from KV
    let options = {};
    if (DEBUG) {
      options.cacheControl = {
        bypassCache: true,
      };
    }
    
    const page = await getAssetFromKV(event, options);
    const response = new Response(page.body, page);
    
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');
    response.headers.set('Feature-Policy', 'none');
    
    return response;
  } catch (e) {
    // Return a 404 for all other errors
    return new Response('Not Found', { status: 404 });
  }
} 