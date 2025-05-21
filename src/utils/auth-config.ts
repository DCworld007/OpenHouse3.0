const MAIN_DOMAIN = 'https://unifyplan.vercel.app';
const LOCAL_DOMAIN = 'http://localhost:3000';

export function getAuthDomain(): string {
  if (typeof window === 'undefined') {
    return MAIN_DOMAIN;
  }

  // For local development
  if (window.location.hostname === 'localhost') {
    return LOCAL_DOMAIN;
  }

  // For production
  if (window.location.hostname === 'unifyplan.vercel.app') {
    return MAIN_DOMAIN;
  }

  // For preview deployments, use the main domain for auth
  return MAIN_DOMAIN;
}

export function shouldRedirectToMainAuth(): boolean {
  if (typeof window === 'undefined') return false;

  // Don't redirect if we're already on the main domain
  if (window.location.origin === MAIN_DOMAIN) return false;

  // Don't redirect for local development
  if (window.location.hostname === 'localhost') return false;

  // Redirect for all other cases (preview deployments, etc.)
  return true;
}

export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return MAIN_DOMAIN;

  const currentUrl = encodeURIComponent(window.location.href);
  return `${MAIN_DOMAIN}/auth/login?returnTo=${currentUrl}`;
}

export function getLoginCallbackUrl(): string {
  if (typeof window === 'undefined') return '/plans';

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  
  if (returnTo) {
    try {
      // Validate the URL to prevent open redirect vulnerabilities
      const url = new URL(returnTo);
      // Only allow redirects to our known domains
      if (url.hostname === 'unifyplan.vercel.app' ||
          url.hostname === 'localhost' ||
          url.hostname.endsWith('.vercel.app')) {
        return returnTo;
      }
    } catch (e) {
      console.error('Invalid return URL:', e);
    }
  }

  return '/plans';
}

// Get OAuth configuration
export function getOAuthConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    mainDomain: MAIN_DOMAIN,
    localDomain: LOCAL_DOMAIN,
  };
} 