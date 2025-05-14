// This file configures Cloudflare Pages to use Edge runtime for all routes
export default {
  onBeforeRequest(request, env) {
    // Add D1 and KV variables to the request context
    return {
      force_edge_runtime: true,
      data: {
        force_edge: true,
        db: env.DB,
        cache: env.CACHE
      },
    };
  },
  onResponse(response, request, env) {
    // Return the response as-is
    return response;
  }
};
