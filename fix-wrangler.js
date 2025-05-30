const fs = require('fs');

// Define the correct content for wrangler.toml
const correctContent = `# OpenHouse3.0 Cloudflare Pages configuration
name = "openhouse3-0"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".vercel/output/static"

# Environment variables for all environments
[vars]
JWT_SECRET = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz"
NODE_VERSION = "18.20.8"

# Production environment configuration
[env.production]
# Production environment variables
vars = { JWT_SECRET = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz", NODE_VERSION = "18.20.8" }

# Production D1 database
[[env.production.d1_databases]]
binding = "DB"
database_name = "openhouse-local"
database_id = "527c7d53-4926-4c79-bbe6-21121a10f06b"

# Production KV namespace
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "99b502ae72564574bb8e2041a983f287"

# Preview environment (development) 
[env.preview]
# Preview environment variables are the same as production
vars = { JWT_SECRET = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz", NODE_VERSION = "18.20.8" }

# Preview D1 database
[[env.preview.d1_databases]]
binding = "DB"
database_name = "openhouse-local-preview"
database_id = "527c7d53-4926-4c79-bbe6-21121a10f06b"

# Preview KV namespace
[[env.preview.kv_namespaces]]
binding = "CACHE"
id = "99b502ae72564574bb8e2041a983f287"
preview_id = "99b502ae72564574bb8e2041a983f287"
`;

// Write the content to wrangler.toml
fs.writeFileSync('wrangler.toml', correctContent);

console.log('✅ Fixed wrangler.toml file'); 