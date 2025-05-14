# Deployment Guide for OpenHouse3.0

This guide provides information on deploying OpenHouse3.0 to Cloudflare Pages and potential issues that might arise during deployment.

## Deployment Requirements

1. Node.js version 18.20.8 (specified in `.node-version` file)
2. Cloudflare Pages account
3. Environment variables set in the Cloudflare Pages dashboard:
   - `JWT_SECRET` - Secret used for signing JWT tokens
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth Client ID

## Build Command

For local builds:
```
npm run build
```

For Cloudflare Pages CI builds:
```
npm run cloudflare:build
```

The build command runs several scripts in sequence:
1. Prepares the environment for CI (when applicable)
2. Fixes the wrangler.toml file format
3. Prepares Cloudflare-specific configuration files
4. Forces Edge runtime for all API routes
5. Builds the Next.js application
6. Ensures all generated function files have Edge runtime declarations

## Cloudflare Pages Configuration

When configuring your Cloudflare Pages project, use these settings:

| Setting | Value |
|---------|-------|
| Build command | `npm run cloudflare:build` |
| Build output directory | `.vercel/output/static` |
| Node.js version | 18.20.8 |

## Known Issues and Fixes

### 1. `wrangler.toml` Parse Error

If you encounter a TOML parse error like this in your Cloudflare Pages build:

```
[31m✘ [41;31m[[41;97mERROR[41;31m][0m [1mParseError: Unterminated inline array[0m
```

**Fix:** 
- The fix is automatically applied by the `scripts/fix-wrangler-toml.js` script, which rewrites the wrangler.toml file with proper formatting.
- This script ensures that all lines end with a newline character and that the TOML syntax is correct.

### 2. Edge Runtime for Functions

If you encounter errors about routes not being configured to run with Edge Runtime:

```
⚡️ ERROR: Failed to produce a Cloudflare Pages build from the project.
⚡️ 
⚡️ 	The following routes were not configured to run with the Edge Runtime:
⚡️ 	  - /api/auth/login
...
```

**Fix:**
- The fix is automatically applied by the `fix-functions-runtime.js` script which adds the Edge runtime directive to all function files in the `functions` directory.
- This script is run as part of the build process.

### 3. Node.js Version Warning

If you see warnings about Node.js version compatibility:

```
npm warn EBADENGINE Unsupported engine {
  npm warn EBADENGINE   package: 'glob@11.0.2',
  npm warn EBADENGINE   required: { node: '20 || >=22' },
  npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
```

**Action Required:**
- These warnings can be safely ignored for now, as Node.js 18.20.8 is still supported.
- In the future, we should upgrade to Node.js 20 or newer to address these warnings.

### 4. Package Lock Synchronization Issue

If you encounter an error like this:

```
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync.
```

**Fix:**
- This usually happens when a new dependency is added but the package-lock.json file is not updated.
- Run `npm install` locally to update the package-lock.json, then commit and push the changes.
- Our CI scripts now use `npm install` instead of `npm ci` to avoid this issue during deployment.

## Manual Deployment Steps

If you need to manually deploy the application:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/OpenHouse3.0.git
   cd OpenHouse3.0
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the build:
   ```
   npm run build
   ```

4. Deploy to Cloudflare Pages:
   ```
   npm run pages:deploy
   ```

## Troubleshooting

If you continue to encounter deployment issues:

1. Check the console output for specific error messages.
2. Verify that all environment variables are correctly set in the Cloudflare Pages dashboard.
3. Make sure the wrangler.toml file is correctly formatted.
4. Check that all API routes in the source code have `export const runtime = 'edge';` declarations.
5. Run `node scripts/fix-wrangler-toml.js` to fix any TOML formatting issues.
6. Run `node fix-functions-runtime.js` after build to ensure all function files have Edge runtime declarations. 