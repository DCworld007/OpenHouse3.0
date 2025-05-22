const MAIN_DOMAIN = 'https://unifyplan.vercel.app';
const LOCAL_DOMAIN = 'http://localhost:3000';

export function getAuthDomain(): string {
  if (typeof window === 'undefined') {
    // Server-side: Default to MAIN_DOMAIN, but could be made more flexible with env vars if needed
    return MAIN_DOMAIN;
  }
  // Client-side: Always use the current origin. This ensures preview deployments use their own domain.
  return window.location.origin;
}

export function shouldRedirectToMainAuth(): boolean {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname;
  // Don't redirect if we're already on the main production domain
  if (hostname === 'unifyplan.vercel.app') return false;

  // Don't redirect for local development
  if (hostname === 'localhost' || hostname.startsWith('localhost:')) return false;

  // Don't redirect for Vercel preview deployments (they use *.vercel.app but are not the main production domain)
  if (hostname.endsWith('.vercel.app')) return false;
  
  // For any other custom domains or scenarios where you might want to centralize auth,
  // you could return true, but for now, default to false to keep auth on the current domain.
  return false;
}

export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return MAIN_DOMAIN;

  const currentUrl = encodeURIComponent(window.location.href);
  return `${MAIN_DOMAIN}/auth/login?returnTo=${currentUrl}`;
}

export function getLoginCallbackUrl(): string {
  if (typeof window === 'undefined') return '/plans';

  // Check for pending invite token in sessionStorage
  const pendingInviteToken = sessionStorage.getItem('pendingInviteToken');
  if (pendingInviteToken) {
    sessionStorage.removeItem('pendingInviteToken');
    return `/invite?token=${pendingInviteToken}`;
  }

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  
  if (returnTo) {
    try {
      // First try to parse as a full URL
      let url: URL;
      try {
        url = new URL(returnTo);
      } catch {
        // If parsing as full URL fails, try as a relative URL
        url = new URL(returnTo, window.location.origin);
      }

      // Extract the path and query parameters
      const path = url.pathname;
      const searchParams = url.searchParams;

      // Special handling for invite links
      if (path === '/invite' && searchParams.has('token')) {
        const token = searchParams.get('token');
        // Always use relative path for invite links to ensure proper domain handling
        return `/invite?token=${token}`;
      }

      // For other URLs, validate the domain
      if (url.hostname === 'unifyplan.vercel.app' ||
          url.hostname === 'localhost' ||
          url.hostname.endsWith('.vercel.app')) {
        // Convert to relative path if it's on the same domain
        if (url.origin === window.location.origin) {
          return url.pathname + url.search;
        }
        return returnTo;
      }
    } catch (e) {
      console.error('[Auth Config] Invalid return URL:', e);
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