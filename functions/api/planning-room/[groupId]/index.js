// Direct implementation for the planning-room endpoint
export async function onRequest(context) {
  const { request, env, params } = context;
  console.log('[planning-room/[groupId]/index.js] Received request:', request.method, params);
  
  // Common headers
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    if (request.method === 'GET') {
      return await onRequestGet(context);
    }
    
    // Method not supported
    return new Response(JSON.stringify({ 
      error: `Method ${request.method} not supported` 
    }), { 
      status: 405,
      headers
    });
    
  } catch (error) {
    console.error('[planning-room/[groupId]/index.js] Error handling request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
}

// GET handler
export async function onRequestGet(context) {
  const { env, params } = context;
  console.log('[planning-room/[groupId]/index.js] Handling GET request for groupId:', params?.groupId);
  
  // Common headers
  const headers = { 'Content-Type': 'application/json' };
  
  const groupId = params?.groupId;
  
  if (!groupId) {
    return new Response(JSON.stringify({ 
      error: 'Missing groupId parameter' 
    }), { 
      status: 400,
      headers
    });
  }
  
  try {
    // In development, return a mock response if DB is not available
    if (!env.DB) {
      console.log('[planning-room/[groupId]/index.js] DB not available, returning mock response');
      
      // Return a 404 to trigger room creation in the client
      return new Response(JSON.stringify({ 
        error: 'Room not found', 
        shouldCreate: true
      }), { 
        status: 404,
        headers
      });
    }
    
    // Check if room exists in DB
    const room = await env.DB.prepare('SELECT * FROM PlanningRoom WHERE id = ?')
      .bind(groupId)
      .first();
    
    if (!room) {
      return new Response(JSON.stringify({ 
        error: 'Room not found' 
      }), { 
        status: 404,
        headers
      });
    }
    
    return new Response(JSON.stringify(room), { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('[planning-room/[groupId]/index.js] Database error:', error);
    return new Response(JSON.stringify({ 
      error: 'Database error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
} 