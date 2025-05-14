// Join planning room via invite token
export async function onRequest(context) {
  const { request, env, params } = context;
  console.log('[join.js] Received request:', request.method, params);
  
  // Handle CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers
    });
  }
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: `Method ${request.method} not supported` 
    }), { 
      status: 405,
      headers
    });
  }
  
  try {
    return await onRequestPost(context, headers);
  } catch (error) {
    console.error('[join.js] Error handling request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
}

export async function onRequestPost(context, responseHeaders) {
  const { request, env, params } = context;
  const { token } = params;
  
  // Use headers passed from the main handler
  const headers = responseHeaders || { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };
  
  if (!token) {
    return new Response(JSON.stringify({ 
      error: 'Missing invite token' 
    }), { 
      status: 400,
      headers
    });
  }
  
  try {
    // Extract user ID from cookies or auth header
    // In a production environment, this would validate the JWT token
    // For now, we'll use a simple mock userId
    const userId = 'user-123'; // In production, extract this from auth
    
    // In a production environment, verify the token is valid and not expired
    // For development, we'll assume all tokens are valid
    
    // Extract the groupId from the token
    // In a real implementation, this would be fetched from the database
    // For development, we'll generate a fake groupId based on the token
    const tokenHash = hashCode(token);
    const mockGroupId = `group-${Math.abs(tokenHash).toString(16).padStart(8, '0')}`;
    
    // In a real implementation, add the user to the group in the database
    // For development, we'll simulate success
    
    // Return success with mock group details
    return new Response(JSON.stringify({
      room: {
        id: mockGroupId,
        name: 'Planning Room',
        description: 'Generated from invite',
        ownerId: 'owner-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }), { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('[join.js] Error processing join request:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error', 
      details: error.message 
    }), { 
      status: 500,
      headers
    });
  }
}

// Simple hash function to generate consistent output from a string
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
} 