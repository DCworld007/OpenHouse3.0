# Cloudflare Deployment Fix Guide

This document outlines the changes made to fix the 500 Internal Server Error issues when deploying to Cloudflare Pages.

## Root Cause

The main issue was related to JWT authentication and environment variables:

1. The middleware was using a hardcoded JWT secret instead of getting it from environment variables
2. The JWT_SECRET was incorrectly defined in `wrangler.toml` file instead of being set as a Cloudflare secret
3. Various configuration files contained hardcoded fallback secrets, which should not be used in production

## Changes Made

### 1. Updated `src/middleware.ts`

Modified the `verifyJWT` function to properly get the JWT secret from environment variables:

```javascript
async function verifyJWT(token: string) {
  try {
    // Get the secret based on environment
    let secretValue;
    
    // First try to get from environment variables
    if (process.env.JWT_SECRET) {
      secretValue = process.env.JWT_SECRET;
      console.log('[middleware] Using JWT_SECRET from environment');
    } 
    // Then try Cloudflare Workers environment
    else if ((globalThis as any).JWT_SECRET) {
      secretValue = (globalThis as any).JWT_SECRET;
      console.log('[middleware] Using JWT_SECRET from globalThis');
    }
    // Fallback to hardcoded value only in development
    else if (process.env.NODE_ENV === 'development') {
      secretValue = "X7d4KjP9Rt6vQ8sFbZ2mEwHc5LnAaYpG3xNzVuJq"; // Dev secret
      console.log('[middleware] Using hardcoded JWT_SECRET (development only)');
    } 
    // In production, this is an error
    else {
      console.error('[middleware] JWT_SECRET not found in environment variables');
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    
    // Rest of the function...
  }
}
```

### 2. Updated `wrangler.toml`

Removed hardcoded JWT_SECRET from wrangler.toml:

```toml
[vars]
MY_TEST_VAR = "hello_from_wrangler_vars"
# JWT_SECRET should be set as a secret in the Cloudflare dashboard, not in this file

[env.production]
# ...
# JWT_SECRET should be set as a secret, not in this file
vars = { NODE_VERSION = "18.20.8" }
```

### 3. Updated `.cloudflare/pages.js`

Modified the Cloudflare Pages configuration:

```javascript
module.exports = {
  // ...
  env: {
    // JWT_SECRET should be provided as a secret in the Cloudflare dashboard
    // Will throw an error in production if not set
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_VERSION: process.env.NODE_VERSION || '18.20.8',
  },
};
```

### 4. Updated `scripts/prepare-for-cloudflare.js`

Updated the script to remove hardcoded JWT_SECRET:

```javascript
// Write the pages config
fs.writeFileSync(
  pagesConfigPath,
  `module.exports = {
  // ...
  env: {
    // JWT_SECRET should be set as a secret in the Cloudflare dashboard
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_VERSION: process.env.NODE_VERSION || '18.20.8',
  },
};\n`
);
```

## How to Deploy Correctly

1. First, set up the necessary secrets in your Cloudflare dashboard:

```
JWT_SECRET
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

2. Use the Cloudflare dashboard to add these secrets to your project:
   - Go to your Cloudflare Pages project
   - Navigate to Settings > Environment variables
   - Add each of the above secrets
   - Ensure they are set for both Production and Preview environments

3. Deploy using the proper command:

```bash
npm run pages:deploy
```

## Troubleshooting

If you still encounter 500 errors after deployment:

1. Check the Cloudflare dashboard logs for specific error messages
2. Verify that all required environment variables are set in the Cloudflare dashboard
3. Ensure that the JWT secret is consistent across all environments
4. If needed, increase logging in the middleware to debug authentication issues 