export function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: use environment variables
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    return 'http://localhost:3000';
  }

  // Client-side: use window.location.origin
  return window.location.origin;
}

export function getRedirectUri(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/auth/login`;
}

export function getOAuthConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: getRedirectUri(),
  };
}

// Log the current configuration (helpful for debugging)
if (typeof window !== 'undefined') {
  console.log('[URL Utils] Configuration:', {
    baseUrl: getBaseUrl(),
    redirectUri: getRedirectUri(),
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    origin: window.location.origin
  });
} 