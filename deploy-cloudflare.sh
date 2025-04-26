#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Build the application
echo "Building the application..."
npm run build

# Deploy to Cloudflare
echo "Deploying to Cloudflare..."
npx wrangler pages deploy .next/static --project-name openhouse3 --branch main

echo "Deployment complete!" 