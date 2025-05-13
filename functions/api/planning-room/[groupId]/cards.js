// Direct implementation for the cards endpoint
export async function onRequest(context) {
  const { request, env, params } = context;
  console.log('[cards.js] Received request:', request.method, params);
  
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
    // Handle different HTTP methods
    if (request.method === 'GET') {
      return await handleGet(context);
    } else if (request.method === 'POST') {
      return await handlePost(context);
    } else if (request.method === 'PUT') {
      return await handlePut(context);
    } else if (request.method === 'DELETE') {
      return await handleDelete(context);
    }
    
    // Method not supported
    return new Response(JSON.stringify({ 
      error: `Method ${request.method} not supported` 
    }), { 
      status: 405,
      headers
    });
  } catch (error) {
    console.error('[cards.js] Error handling request:', error);
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
async function handleGet(context) {
  const { env, params } = context;
  const groupId = params?.groupId;
  const headers = { 'Content-Type': 'application/json' };
  
  // In development, return a mock empty doc response
  return new Response(JSON.stringify({
    groupId,
    cards: [],
    doc: '',  // This would normally be a base64 encoded Yjs document
    message: 'Mock cards response'
  }), { 
    status: 200,
    headers
  });
}

// POST handler - Create a new card
async function handlePost(context) {
  const { request, params } = context;
  const groupId = params?.groupId;
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    const body = await request.json();
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Card created',
      card: body
    }), { 
      status: 201,
      headers
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Invalid request body', 
      details: error.message 
    }), { 
      status: 400,
      headers
    });
  }
}

// PUT handler - Update cards (usually the Yjs document)
async function handlePut(context) {
  const { request, params } = context;
  const groupId = params?.groupId;
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    const body = await request.json();
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Cards updated'
    }), { 
      status: 200,
      headers
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Invalid request body', 
      details: error.message 
    }), { 
      status: 400,
      headers
    });
  }
}

// DELETE handler - Delete a card
async function handleDelete(context) {
  const { request, params } = context;
  const groupId = params?.groupId;
  const headers = { 'Content-Type': 'application/json' };
  
  const url = new URL(request.url);
  const cardId = url.searchParams.get('id');
  
  if (!cardId) {
    return new Response(JSON.stringify({ 
      error: 'Missing card ID' 
    }), { 
      status: 400,
      headers
    });
  }
  
  // Return success response
  return new Response(JSON.stringify({
    success: true,
    message: 'Card deleted',
    cardId
  }), { 
    status: 200,
    headers
  });
} 