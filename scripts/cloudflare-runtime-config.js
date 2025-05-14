const fs = require('fs');
const path = require('path');

console.log('🚀 Configuring Cloudflare Pages Edge Runtime for Next.js');

// Create .cloudflare directory if it doesn't exist
const cloudflareDir = path.join(process.cwd(), '.cloudflare');
if (!fs.existsSync(cloudflareDir)) {
  fs.mkdirSync(cloudflareDir, { recursive: true });
}

// Create the pages.js file to configure Cloudflare Pages
const pagesJsContent = `// This file configures Cloudflare Pages to use Edge runtime for all routes
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
`;

fs.writeFileSync(path.join(cloudflareDir, 'pages.js'), pagesJsContent);
console.log('✅ Created .cloudflare/pages.js');

// Update or create .node-version file to ensure Node.js compatibility
fs.writeFileSync(path.join(process.cwd(), '.node-version'), '18.20.8');
console.log('✅ Created .node-version with 18.20.8');

// Create a special _redirects file for Cloudflare Pages
const redirectsContent = `# Redirect API requests to the Functions serving them
/api/*  /.netlify/functions/api/:splat  200

# Handle all other routes with Next.js
/*  /index.html  200
`;

fs.writeFileSync(path.join(process.cwd(), 'public', '_redirects'), redirectsContent);
console.log('✅ Created public/_redirects');

// Add a special .cloudflare-mode.json file
const modeContent = JSON.stringify({ mode: "edge" }, null, 2);
fs.writeFileSync(path.join(process.cwd(), '.cloudflare-mode.json'), modeContent);
console.log('✅ Created .cloudflare-mode.json');

console.log('🎉 Edge Runtime configuration for Cloudflare Pages complete!'); 