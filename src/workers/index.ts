import authWorker from './auth-worker';
import dataWorker from './data-worker';
import kvWorker from './kv-worker';
import { corsHeaders } from './cors-headers';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Route to appropriate worker based on path
    if (path.startsWith('/api/auth')) {
      return authWorker.fetch(request, env, ctx);
    } else if (path.startsWith('/api/kv')) {
      return kvWorker.fetch(request, env, ctx);
    } else if (path.startsWith('/api/cards') || path.startsWith('/api/rooms') || path.startsWith('/api/messages')) {
      return dataWorker.fetch(request, env, ctx);
    }

    // Default response for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  },
}; 