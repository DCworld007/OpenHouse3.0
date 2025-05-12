# JWT Authentication Deployment Guide

This guide explains how to properly set up JWT authentication for your Cloudflare Workers environment.

## Local Development

For local development, the application will use a hardcoded JWT secret from the JWT utility. This ensures a smooth development experience without requiring environment setup.

## Production Deployment

For production deployment, follow these steps to securely set up your JWT secret:

### 1. Generate a Strong JWT Secret

Generate a cryptographically secure random string of at least 32 characters:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or using OpenSSL
openssl rand -base64 32
```

### 2. Set the JWT Secret in Your Environment

Use Wrangler to set the JWT_SECRET as a secret in your Cloudflare Workers environment:

```bash
# For production
wrangler secret put JWT_SECRET --env production

# For staging
wrangler secret put JWT_SECRET --env staging
```

You'll be prompted to enter the secret value generated in step 1.

### 3. Update Your .dev.vars for Local Development

For local development, ensure your .dev.vars file contains the same JWT_SECRET value:

```
JWT_SECRET=your_development_jwt_secret_here
```

## Troubleshooting

If you encounter JWT verification issues:

1. Check that the same JWT_SECRET is used across:
   - Middleware (for verifying tokens)
   - Login API (for creating tokens)
   - /api/me endpoint (for retrieving user information)

2. Verify that your JWT_SECRET is at least 32 characters long

3. If experiencing issues in production, verify that the secret was properly deployed:
   ```bash
   wrangler secret list --env production
   ```

## Security Considerations

- Never commit your JWT_SECRET to version control
- Rotate your JWT_SECRET periodically
- Use environment-specific secrets for different environments
- Ensure your secret is sufficiently complex (32+ random characters) 