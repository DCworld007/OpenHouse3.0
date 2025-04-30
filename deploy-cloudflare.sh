#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check for required environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN environment variable is not set"
  exit 1
fi

# Build the application
echo "Building the application..."
npm run build

# Deploy to Cloudflare
echo "Deploying to Cloudflare..."
npx wrangler pages deploy .next --project-name openhouse3 --branch main

echo "Deployment complete!" 