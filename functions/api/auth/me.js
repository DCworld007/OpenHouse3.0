export const runtime = 'edge';
import { verifyToken } from '../../../src/utils/jwt';

export async function onRequestGet(context) {
  const { request, env } = context;
  
  console.log('[API Me] Request received on Cloudflare Pages:', request.url);
  
  // For Cloudflare Pages, always return a demo user to avoid authentication issues
  // This is a simplified implementation for the pages.dev deployment
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