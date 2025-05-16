export const runtime = 'edge';
import { signToken } from '../../../src/utils/jwt';

export async function onRequestPost(context) {
  const { request, env } = context;

  console.log('[API Login CF] Received login request on Cloudflare Pages');
  
  // For Cloudflare Pages, always succeed with a demo user
  // This is a simplified implementation for the pages.dev deployment
  
  return new Response(JSON.stringify({ 
    authenticated: true,
    user: {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User',
      picture: 'https://via.placeholder.com/150'
    },
    token: 'demo-cloudflare-token' // Note: This is just for compatibility, not actually used
  }), { 
    headers: { 
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=demo-cloudflare-token; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    } 
  });
}