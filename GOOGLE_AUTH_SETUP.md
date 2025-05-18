# Setting Up Google OAuth Authentication

This guide will walk you through the process of setting up Google OAuth for your OpenHouse application.

## Creating a Google OAuth Client ID

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. Select "Web application" as the application type
6. Add a name for your OAuth client (e.g., "OpenHouse Authentication")
7. Add authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: your actual domain, e.g., `https://your-domain.com`
8. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-domain.com/api/auth/callback/google`
9. Click "Create"
10. Take note of your Client ID and Client Secret

## Configuring Your Environment Variables

Create or update your `.env.local` file with the following variables:

```
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# JWT Secret (32+ random characters)
JWT_SECRET=Zq83vN!@uXP4w$Kt9sLrB^AmE5cG1dYz
```

For production deployment on Cloudflare, make sure to also add these as environment variables in your Cloudflare dashboard or using Wrangler CLI.

## Testing Authentication

Once you've set up your Google OAuth client ID:

1. Restart your development server
2. Navigate to http://localhost:3000/auth/login
3. Click the "Sign in with Google" button
4. Complete the Google authentication flow
5. You should be redirected back to your application and be authenticated

## Troubleshooting

If you encounter issues with Google authentication:

1. **"The OAuth client was not found" error**:
   - Verify that your client ID is correctly set in your environment variables
   - Ensure the client ID is valid and the project is enabled in Google Cloud Console
   - Check if the authorized JavaScript origins match your actual origin

2. **Redirect URI mismatch**:
   - Ensure the callback URL in your application (`/api/auth/callback/google`) matches what you've configured in Google Cloud Console

3. **Development mode**:
   - During development, you can use the "Test Authentication" button instead, which uses a mock token for testing

4. **Cookie issues**:
   - Ensure your browser accepts cookies from localhost
   - Try using an incognito/private browsing window to test

## Using Test Authentication

For development purposes only, you can use the test authentication:

1. Navigate to http://localhost:3000/auth/login
2. Click the "Test Authentication (Dev Only)" button
3. This will set a pre-signed JWT token with test user information
4. You'll be automatically redirected to the homepage

**Note:** Test authentication bypasses the actual OAuth flow and should only be used during development. 