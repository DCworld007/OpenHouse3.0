// Simple direct implementation for development
export async function onRequest(context) {
  const { request, env } = context;
  console.log('[rooms.js] Received request:', request.method);
  
  // Common headers
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    if (request.method === 'POST') {
      return await onRequestPost(context);
    }
    
    // Handle GET (or other methods)
    // This is a simplified implementation for GET
    return new Response(JSON.stringify({ 
      rooms: [],
      message: 'No rooms found'
    }), { 
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('[rooms.js] Error handling request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
}

// POST handler
export async function onRequestPost(context) {
  const { request, env } = context;
  console.log('[rooms.js] Handling POST request');
  
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON body' 
      }), { 
        status: 400,
        headers
      });
    }
    
    // Log the body for debugging
    console.log('[rooms.js] POST body:', body);
    
    // Validate required fields
    const { id, name } = body;
    if (!id || !name) {
      return new Response(JSON.stringify({ 
        error: 'Room ID and name are required', 
        received: { id, name } 
      }), { 
        status: 400,
        headers
      });
    }
    
    // Mock success response
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Room created or already exists',
      roomId: id
    }), { 
      status: 201,
      headers
    });
    
  } catch (error) {
    console.error('[rooms.js] Error handling POST request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
} 