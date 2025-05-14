// Simple planning room activity endpoint implementation for Cloudflare
export async function onRequest(context) {
  const { request, env, params } = context;
  const { groupId } = params;
  
  console.log('[activity.js] Received request:', request.method, params);
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  // Handle GET requests - return empty activities list
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({ activities: [] }), 
      { status: 200, headers }
    );
  }
  
  // Handle POST requests - just acknowledge receipt
  if (request.method === 'POST') {
    let activityData;
    try {
      activityData = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }), 
        { status: 400, headers }
      );
    }
    
    // Generate a random ID for the activity
    const id = Math.random().toString(36).substring(2, 15);
    
    return new Response(
      JSON.stringify({
        success: true,
        activityId: id,
        timestamp: new Date().toISOString()
      }), 
      { status: 200, headers }
    );
  }
  
  // Method not supported
  return new Response(
    JSON.stringify({ error: `Method ${request.method} not supported` }), 
    { status: 405, headers }
  );
} 