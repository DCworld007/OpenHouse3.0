# Authentication System Debugging Guide

This guide provides information on how to debug authentication issues in the OpenHouse application.

## Authentication System Overview

The authentication system uses:
- Google Authentication for sign-in
- JWT tokens stored in cookies for session management
- Edge-compatible JWT implementation using the `jose` library

## Cookie Names

The application uses cookies to store authentication state:

- `auth_token`: The main JWT cookie used for authentication

## Debugging Tools

We've added several tools to help diagnose authentication issues:

### 1. Auth Test Page

Visit `/auth-test` in your browser to see:
- Current authentication state
- Cookie debug information
- Browser cookies (client-side only)

### 2. Debug Endpoints

- `/api/auth/debug-cookies`: Returns information about cookies and JWT verification
- `/api/auth/client-test`: Provides browser console code to test auth endpoints

### 3. Browser Console Debugging

You can use the following code in your browser console to debug auth state:

```javascript
// Check current cookies
console.log('Current cookies:', document.cookie);

// Test authentication endpoint
fetch('/api/auth/me')
  .then(res => res.json())
  .then(data => console.log('Auth endpoint response:', data))
  .catch(err => console.error('Error with auth endpoint:', err));

// Test debug cookies endpoint
fetch('/api/auth/debug-cookies')
  .then(res => res.json())
  .then(data => console.log('Debug cookies response:', data))
  .catch(err => console.error('Error with debug endpoint:', err));
```

## Common Issues

### 1. Authentication Not Working

If you're seeing 401 responses from `/api/auth/me`:

1. Check if cookies are being set:
   - Visit `/auth-test` and check for the presence of `auth_token`
   - Check browser console for any cookie-related errors

2. Verify if the JWT is valid:
   - Look at the debug cookies response to see if token verification succeeds

3. Verify if the cookie is being sent properly:
   - Check request headers in the browser network tab

### 2. Invalid Token Errors

If you're getting "Invalid token" errors:

1. The JWT may be malformed or expired
2. The JWT_SECRET may be different between environments
3. The token may be signed with a different algorithm

### 3. Cookie Not Being Set

If the authentication cookie is not being set:

1. Check the login response headers for `Set-Cookie`
2. Ensure cookies are not being blocked by browser settings
3. Verify that the cookie is being set with the correct domain and path

## Authentication Flow

1. User logs in via Google Authentication
2. Server verifies the Google token
3. Server creates a JWT with user information
4. JWT is set as `auth_token` cookie
5. On subsequent requests, the middleware checks for this cookie
6. If valid, the request proceeds; if invalid, the user is redirected to login

## Recent Fixes

We've made several improvements to the authentication system:

1. Unified cookie name to be consistently `auth_token`
2. Created a reusable auth utility in `src/utils/auth.ts`
3. Added more robust token verification and user information validation
4. Added enhanced logging and debugging tools
5. Improved error handling for authentication failures

## Need More Help?

If you continue to experience authentication issues:

1. Check server logs for authentication-related error messages
2. Use the debugging tools to gather more information
3. Verify environment variables are set correctly 