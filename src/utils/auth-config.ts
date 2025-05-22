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

  // Check for pending invite token in sessionStorage first
  const pendingInviteToken = sessionStorage.getItem('pendingInviteToken');
  if (pendingInviteToken) {
    // Intentionally do not remove it here yet. The invite page itself should clear it once successfully processed.
    // This makes the retrieval idempotent if called multiple times before actual redirect.
    return `/invite?token=${pendingInviteToken}`;
  }

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  
  if (returnTo) {
    // If returnTo is an invite link, prioritize that directly
    // Decode it once, as it comes from URL query param
    const decodedReturnTo = decodeURIComponent(returnTo);
    if (decodedReturnTo.startsWith('/invite?token=')) {
      // Ensure the invite page clears sessionStorage.pendingInviteToken if it uses this
      return decodedReturnTo;
    }

    // Fallback to more general URL parsing for other cases
    try {
      let url: URL;
      try {
        url = new URL(decodedReturnTo); // Use decodedReturnTo
      } catch {
        url = new URL(decodedReturnTo, window.location.origin); // Use decodedReturnTo
      }

      const path = url.pathname;
      // We already handled /invite?token= above
      // For other URLs, validate the domain
      if (url.hostname === 'unifyplan.vercel.app' ||
          url.hostname === 'localhost' ||
          url.hostname.endsWith('.vercel.app')) {
        if (url.origin === window.location.origin) {
          return url.pathname + url.search;
        }
        return decodedReturnTo; // Return the full, decoded returnTo if domains differ but are allowed
      }
    } catch (e) {
      console.error('[Auth Config] Invalid returnTo URL after initial invite check:', e);
    }
  }

  return '/plans'; // Default callback
}

// Get OAuth configuration
export function getOAuthConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    mainDomain: MAIN_DOMAIN,
    localDomain: LOCAL_DOMAIN,
  };
} 