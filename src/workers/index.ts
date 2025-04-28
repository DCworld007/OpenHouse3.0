import dataWorker from './data-worker';
import kvWorker from './kv-worker';
import { corsHeaders } from './cors-headers';

export interface Env {
  AUTH_SECRET: string;
  KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.startsWith('/api/data')) {
        return await dataWorker.fetch(request, env, ctx);
      } else if (path.startsWith('/api/kv')) {
        return await kvWorker.fetch(request, env, ctx);
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      return new Response('Internal error', { status: 500 });
    }
  },
}; 