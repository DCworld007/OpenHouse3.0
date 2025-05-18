import { verifyToken } from '@/lib/cloudflare-jwt';
import { corsHeaders } from './cors-headers';
import { Env } from '@/types/worker';

// Helper function to get token from request
async function getTokenFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

async function handleGet(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.pathname.substring(1); // Remove leading slash
    const value = await env.KV.get(key);
    
    if (value === null) {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }
    
    return new Response(value, { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
}

async function handlePut(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.pathname.substring(1);
    const value = await request.text();
    
    await env.KV.put(key, value);
    return new Response('Success', { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
}

async function handleDelete(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.pathname.substring(1);
    
    await env.KV.delete(key);
    return new Response('Success', { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get token from request
    const token = await getTokenFromRequest(request);
    if (!token) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Verify token
    try {
      const payload = await verifyToken(token, env.AUTH_SECRET);
      if (!payload) {
        return new Response('Invalid token', { status: 401, headers: corsHeaders });
      }
    } catch (error) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders });
    }

    // Route request based on method
    if (request.method === 'GET') {
      return handleGet(request, env, ctx);
    } else if (request.method === 'PUT') {
      return handlePut(request, env, ctx);
    } else if (request.method === 'DELETE') {
      return handleDelete(request, env, ctx);
    }
    
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
}; 