import { verifyToken } from '@/lib/cloudflare-jwt';
import { corsHeaders } from './cors-headers';

export interface Env {
  AUTH_SECRET: string;
  KV: KVNamespace;
}

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
      return new Response('Key not found', { status: 404, headers: corsHeaders });
    }
    
    return new Response(value, { headers: corsHeaders });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
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
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
}

async function handleDelete(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.pathname.substring(1);
    
    await env.KV.delete(key);
    return new Response('Success', { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
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
    try {
      switch (request.method) {
        case 'GET':
          return handleGet(request, env, ctx);
        case 'PUT':
          return handlePut(request, env, ctx);
        case 'DELETE':
          return handleDelete(request, env, ctx);
        default:
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
      }
    } catch (error) {
      return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
    }
  }
}; 