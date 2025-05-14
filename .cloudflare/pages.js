// Cloudflare Pages integration configuration
export default {
  // Configure the runtime for all routes
  onRequest: async ({ request, env, next }) => {
    // Log incoming requests in production
    if (env.NODE_ENV === 'production') {
      console.log(`[Pages] ${request.method} ${new URL(request.url).pathname}`);
    }
    
    // Add Edge runtime context to all requests
    const context = {
      edge: true,
      db: env.DB,
      cache: env.CACHE,
      jwt_secret: env.JWT_SECRET
    };
    
    // Continue to the next middleware or route handler
    return next({ data: context });
  }
};
