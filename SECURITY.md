# Security Guide for OpenHouse3.0

## Handling Secrets

This application requires several secrets to function properly. For security reasons, we **never** commit actual secrets to the git repository. 

### Required Secrets

1. **JWT_SECRET** - Used for signing and verifying authentication tokens
2. **GOOGLE_CLIENT_ID** - Used for Google OAuth authentication
3. **GOOGLE_CLIENT_SECRET** - Used for Google OAuth authentication

### Setting Up Secrets

#### Local Development

1. Create a `.dev.vars` file in the root of the project (it's gitignored)
2. Add your secrets in the following format:
   ```
   JWT_SECRET="your-very-secure-random-string"
   NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

You can generate a secure JWT secret using this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Cloudflare Deployment

For Cloudflare Pages, set these as Environment Variables in the Cloudflare dashboard:

1. Go to your Cloudflare Pages project
2. Navigate to Settings > Environment variables
3. Add the required secrets as environment variables
4. Make sure to set them for both Production and Preview environments

### Security Best Practices

1. **Never commit secrets** to the Git repository
2. Use different secrets for development, staging, and production
3. Regularly rotate secrets, especially if you suspect they might have been compromised
4. Use environment-specific secrets for each deployment environment
5. Follow the principle of least privilege when creating API keys

### What to Do If Secrets Are Accidentally Committed

If secrets are accidentally committed to the repository:

1. **Immediately invalidate and rotate** all exposed secrets
2. Change all passwords that might have been compromised
3. Issue new API keys and JWT secrets
4. Use tools like `git filter-branch` or BFG Repo-Cleaner to remove secrets from git history
5. Consider using GitGuardian, git-secrets, or similar tools to prevent future leaks

## Reporting Security Issues

Please report security issues to [your-security-email@example.com].

Do not file GitHub issues for security vulnerabilities as they are public. 