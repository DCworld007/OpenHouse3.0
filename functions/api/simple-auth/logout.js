// Simplified logout endpoint for Cloudflare Functions
export async function onRequestGet(context) {
  const { request } = context;
  
  // Clear the token cookie
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    'Set-Cookie': 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  });
  
  return new Response(JSON.stringify({ 
    ok: true 
  }), { 
    status: 200,
    headers: responseHeaders 
  });
} 