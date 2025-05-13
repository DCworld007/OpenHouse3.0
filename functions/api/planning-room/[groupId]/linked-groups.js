// Direct implementation for the linked-groups endpoint
export async function onRequest(context) {
  const { request, env, params } = context;
  console.log('[linked-groups.js] Received request:', request.method, params);
  
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
    console.error('[linked-groups.js] Error handling request:', error);
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
  const { request, env, params } = context;
  console.log('[linked-groups.js] Handling GET request for groupId:', params?.groupId);
  
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
    // Extract groups parameter from query string if present
    const url = new URL(request.url);
    const groupsParam = url.searchParams.get('groups');
    let groups = [];
    
    if (groupsParam) {
      try {
        groups = JSON.parse(decodeURIComponent(groupsParam));
        console.log(`[linked-groups.js] Received ${groups.length} groups in params`);
      } catch (e) {
        console.error('[linked-groups.js] Error parsing groups param:', e);
      }
    }
    
    // For now, return a simple response with no linked groups
    // In a real implementation, this would query the database
    return new Response(JSON.stringify({
      groupId,
      linkedGroups: []
    }), { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('[linked-groups.js] Error processing request:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
} 