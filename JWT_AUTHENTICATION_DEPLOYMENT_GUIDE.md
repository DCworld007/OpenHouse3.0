# JWT Authentication Deployment for Cloudflare: Complete Guide

## Summary of What to Do When Deploying to Cloudflare

When deploying your application to Cloudflare, you need to:

1. Generate a secure 32-character JWT secret
2. Configure this secret in your Cloudflare environment
3. Update your middleware to use environment variables in production
4. Deploy your application to Cloudflare Pages

## Detailed Step-by-Step Instructions

### 1. Generate a Strong JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using OpenSSL
openssl rand -base64 32
```

Save this secret value securely - you'll need it in the following steps.

### 2. Prepare Your Application for Production

1. **Update your middleware.ts file**:

```typescript
// In src/middleware.ts
async function verifyJWT(token: string) {
  try {
    // Development vs Production handling
    let secretValue;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, get from environment variable
      secretValue = process.env.JWT_SECRET;
      if (!secretValue) {
        throw new Error('JWT_SECRET not configured in production environment');
      }
    } else {
      // In development, use hardcoded value
      secretValue = "Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz";
    }
    
    console.log('[middleware] Secret length:', secretValue.length);
    
    const secret = new TextEncoder().encode(secretValue);
    const { payload } = await jwtVerify(token, secret);
    console.log('[middleware] JWT verified successfully:', { sub: payload.sub, email: payload.email });
    return payload;
  } catch (error) {
    console.error('[middleware] JWT verification failed:', error);
    throw error;
  }
}
```

2. **Create a production build**:

```bash
npm run build
```

### 3. Configure Cloudflare Environment

1. **Set up Cloudflare JWT Secret using Wrangler**:

```bash
# Install Wrangler if not already installed
npm install -g wrangler

# Log in to your Cloudflare account
wrangler login

# Set the JWT_SECRET for production
wrangler secret put JWT_SECRET --env production
```

When prompted, paste the JWT secret you generated in step 1.

2. **Verify the secret was set correctly**:

```bash
wrangler secret list --env production
```

You should see JWT_SECRET in the list.

### 4. Update wrangler.toml Configuration

Ensure your `wrangler.toml` file contains the proper configuration:

```toml
[env.production]
name = "your-app-name"
route = "yourdomain.com/*"
# Other production settings...

[vars]
# Other variables...
# Note: Don't put JWT_SECRET here, it's set as a secret value

[site]
bucket = ".next/static"
```

### 5. Set up Deployment Script

Create a `deploy.sh` file to automate the deployment process:

```bash
#!/bin/bash
# Build the application
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .next --project-name=your-project-name --env=production

echo "Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

### 6. Deploy to Cloudflare

Run your deployment script:

```bash
./deploy.sh
```

### 7. Verify the Deployment

1. Visit your production site to ensure it's working
2. Test the authentication workflow:
   - Login
   - Access a protected route
   - Logout

### 8. Troubleshooting Production Issues

If you encounter JWT verification issues in production:

1. **Check Environment Variables**:
   Verify that JWT_SECRET is correctly set in your Cloudflare environment:
   ```bash
   wrangler secret list --env production
   ```

2. **Verify Secret Length**:
   Ensure the secret is exactly 32 characters.

3. **Check for Special Characters**:
   If your secret contains special characters, they may need URL encoding.

4. **Enable Debug Logs**:
   Add temporary debug logs to the middleware to verify the secret length:
   ```typescript
   console.log('[middleware] Secret length:', secretValue.length);
   ```

5. **Recreate the JWT Secret**:
   If issues persist, regenerate and update the JWT secret:
   ```bash
   wrangler secret delete JWT_SECRET --env production
   wrangler secret put JWT_SECRET --env production
   ```

### 9. Maintaining Your JWT Authentication

1. **Rotate Secrets Periodically**:
   Every 90 days (or according to your security policy), update your JWT secret:
   ```bash
   # Generate a new secret
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   
   # Update in Cloudflare
   wrangler secret put JWT_SECRET --env production
   ```

2. **Monitor Failed Authentication Attempts**:
   Set up logging and alerts for repeated JWT verification failures.

3. **Update Token Expiration**:
   In `src/utils/jwt.ts`, you can adjust token expiration time:
   ```typescript
   // Change from 7 days to your preferred duration
   .setExpirationTime('7d')
   ```

### 10. Reverting to a Previous Version

If a deployment breaks authentication:

```bash
# List deployments
wrangler pages deployment list --project-name=your-project-name

# Rollback to a specific deployment
wrangler pages deployment revert --project-name=your-project-name --deployment-id=<DEPLOYMENT_ID>
```

## Environment-Specific Configuration

The above steps cover production deployment. For different environments:

### Staging Environment

```bash
# Set staging JWT secret
wrangler secret put JWT_SECRET --env staging

# Deploy to staging
wrangler pages deploy .next --project-name=your-project-name --env=staging
```

### Development Environment

For local development, the hardcoded secret in the middleware will continue to work.

## Security Best Practices

1. **Never commit JWT secrets** to version control
2. **Use HTTPS** for all production traffic
3. **Set appropriate cookie security options**:
   ```typescript
   'Set-Cookie': `token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
   ```
4. **Implement rate limiting** on authentication endpoints
5. **Monitor for unusual authentication patterns**

Following these steps will ensure your JWT authentication works correctly in all Cloudflare environments while maintaining security best practices. 