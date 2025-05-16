export const runtime = 'edge';
// Pure vanilla JS - no imports
export function onRequest(context) {
  const { request } = context;
  
  // For Cloudflare Pages deployment, always use a demo user
  // This simplifies the implementation and avoids auth token issues
  console.log("[CF Pages API] /me endpoint returning demo user for Cloudflare Pages");
  
  return new Response(JSON.stringify({
    authenticated: true,
    user: {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User',
      picture: 'https://via.placeholder.com/150'
    }
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*' 
    }
  });
} 