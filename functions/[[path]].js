export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(`[[[path]].js] Handling request for: ${path}`);
  
  // Extract API path parts for proper routing
  const parts = path.split('/').filter(Boolean);
  
  if (parts[0] === 'api') {
    // This is an API request, handle it with proper modules
    try {
      // Dynamically import the correct handler based on the path
      const importPath = `./${path}.js`;
      console.log(`[[[path]].js] Trying to import: ${importPath}`);
      
      try {
        // First try: Direct import of the exact path
        const module = await import(importPath);
        console.log(`[[[path]].js] Successfully imported module for ${path}`);
        
        // Determine the correct handler based on request method
        const method = request.method.toLowerCase();
        const handler = module[`onRequest${request.method}`] || module.onRequest;
        
        if (handler) {
          console.log(`[[[path]].js] Found handler for ${method} ${path}`);
          return await handler(context);
        } else {
          console.error(`[[[path]].js] No handler found for ${method} ${path}`);
          return new Response(JSON.stringify({ error: `Method ${request.method} not supported` }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (importError) {
        console.error(`[[[path]].js] Import error for ${importPath}:`, importError);
        
        // Check if this might be a dynamic route
        if (parts.length >= 2) {
          // Try to match a dynamic route pattern
          const basePath = parts.slice(0, -1).join('/');
          const param = parts[parts.length - 1];
          const dynamicImportPath = `./api/${basePath}/[${parts[parts.length - 2]}].js`;
          
          console.log(`[[[path]].js] Trying dynamic import: ${dynamicImportPath}`);
          
          try {
            const module = await import(dynamicImportPath);
            console.log(`[[[path]].js] Successfully imported dynamic module`);
            
            // Set the parameter in context
            context.params = context.params || {};
            context.params[parts[parts.length - 2]] = param;
            
            // Determine the correct handler
            const method = request.method.toLowerCase();
            const handler = module[`onRequest${request.method}`] || module.onRequest;
            
            if (handler) {
              console.log(`[[[path]].js] Found dynamic handler for ${method} ${path}`);
              return await handler(context);
            }
          } catch (dynamicImportError) {
            console.error(`[[[path]].js] Dynamic import error:`, dynamicImportError);
          }
        }
        
        // If we couldn't find a matching handler, return 404
        return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error(`[[[path]].js] Error handling API request:`, error);
      return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Pass through for non-API requests (will be handled by Pages)
  return fetch(request);
}