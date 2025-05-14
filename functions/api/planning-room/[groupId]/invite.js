// Simple planning room invite endpoint implementation for Cloudflare
export async function onRequest(context) {
  const { request, env, params } = context;
  const { groupId } = params;
  
  console.log('[invite.js] Received request:', request.method, params);
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  // Handle OPTIONS request (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  // Only handle POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: `Method ${request.method} not supported` }), 
      { status: 405, headers }
    );
  }
  
  // Create a simple token
  const token = Array.from({ length: 32 }, () => 
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 62)]
  ).join('');
  
  // Set expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Get host info
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  
  // Create invite URL
  const inviteUrl = `${protocol}://${host}/invite?token=${token}`;
  
  // Return the invite details
  return new Response(
    JSON.stringify({
      token,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
      maxUses: 10,
      groupId
    }), 
    { status: 200, headers }
  );
} 