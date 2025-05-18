// Direct implementation for the invite endpoint
export async function onRequest(context) {
  const { request, env, params } = context;
  console.log('[planning-room/[groupId]/invite/index.js] Received request:', request.method, params);
  console.log('[DEBUG] Testing invite endpoint deployment');
  
  // Common headers
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    if (request.method === 'POST' || request.method === 'GET') {
      // Import and use the onRequestPost handler from invite.ts
      const { onRequestPost } = await import('./invite.ts');
      return await onRequestPost(context);
    }
    
    // Method not supported
    return new Response(JSON.stringify({ 
      error: `Method ${request.method} not supported` 
    }), { 
      status: 405,
      headers
    });
    
  } catch (error) {
    console.error('[planning-room/[groupId]/invite/index.js] Error handling request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
} 