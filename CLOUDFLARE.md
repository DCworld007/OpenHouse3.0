# Cloudflare Deployment Guide

This guide explains how to deploy the OpenHouse3.0 application to Cloudflare Pages.

## Prerequisites

- A Cloudflare account
- Cloudflare Wrangler CLI installed (`npm install -g wrangler`)
- Cloudflare API token with appropriate permissions
- Cloudflare D1 database set up

## Environment Setup

1. Create a `.env` file based on `.env.example`
2. Fill in the required environment variables:
   - `DATABASE_URL`: Your Cloudflare D1 database URL
   - `JWT_SECRET`: A secure secret key for JWT signing
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: For Google OAuth
   - `NEXT_PUBLIC_APP_URL`: Your application URL
   - Cloudflare-specific variables

## Database Setup

1. Create a D1 database in your Cloudflare account:
   ```
   wrangler d1 create openhouse3
   ```

2. Apply migrations to the database:
   ```
   wrangler d1 execute openhouse3 --file=./prisma/migrations/init.sql
   ```

3. Update your `wrangler.toml` file with the database ID:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "openhouse3"
   database_id = "your-database-id"
   ```

## Workers Setup

1. Create a KV namespace for caching:
   ```
   wrangler kv:namespace create CACHE
   ```

2. Update your `wrangler.toml` file with the KV namespace ID:
   ```toml
   [[kv_namespaces]]
   binding = "CACHE"
   id = "your-kv-namespace-id"
   preview_id = "your-preview-kv-namespace-id"
   ```

3. Configure your workers in `wrangler.toml`:
   ```toml
   [workers]
   [[workers.routes]]
   pattern = "/api/*"
   script = "src/workers/index.ts"
   ```

## Deployment

### Automatic Deployment

Run the deployment script:
```
./deploy-cloudflare.sh
```

### Manual Deployment

1. Build the application:
   ```
   npm run build
   ```

2. Apply database migrations:
   ```
   wrangler d1 execute openhouse3 --file=./prisma/migrations/init.sql
   ```

3. Deploy to Cloudflare Pages:
   ```
   npx wrangler pages deploy .next --project-name openhouse3 --branch main
   ```

## Troubleshooting

- If you encounter database connection issues, ensure your D1 database is properly set up and the `DATABASE_URL` is correct.
- For authentication issues, check that your JWT secret is properly set and consistent across deployments.
- For OAuth issues, verify your Google OAuth credentials and redirect URIs.
- For worker issues, check the Cloudflare Workers logs in the Cloudflare dashboard.

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/) 