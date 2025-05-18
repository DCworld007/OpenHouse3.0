/**
 * Client-side auth utilities for token management
 * 
 * This provides helpers to get/set tokens with multiple storage mechanisms
 * and fallbacks for browser compatibility
 */

// Function to check if we're on the client side
export const isBrowser = () => typeof window !== 'undefined';

/**
 * Get auth token from any available source (cookie, localStorage)
 */
export function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  
  // Try to get from cookie first
  const cookies = document.cookie.split(';');
  let token = null;
  
  // Look for standard token cookie
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (tokenCookie) {
    token = tokenCookie.split('=')[1];
    if (token) return token;
  }
  
  // Look for alternate token cookie
  const altTokenCookie = cookies.find(c => c.trim().startsWith('auth_token='));
  if (altTokenCookie) {
    token = altTokenCookie.split('=')[1];
    if (token) return token;
  }
  
  // Fallback to localStorage
  return localStorage.getItem('auth_token');
}

/**
 * Set auth token in all storage mechanisms (for maximum compatibility)
 */
export function setAuthToken(token: string, expiryDays = 1): boolean {
  if (!isBrowser()) return false;
  
  try {
    // Clear existing tokens first
    clearAuthToken();
    
    // Set token in cookies with various formats
    const expires = new Date();
    expires.setDate(expires.getDate() + expiryDays);
    
    // Standard format
    document.cookie = `token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    
    // With domain
    const domain = window.location.hostname;
    document.cookie = `token=${token}; path=/; domain=${domain}; expires=${expires.toUTCString()}; SameSite=Lax`;
    
    // Alternate name format
    document.cookie = `auth_token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    
    // Set in localStorage as fallback
    localStorage.setItem('auth_token', token);
    
    return true;
  } catch (error) {
    console.error('Failed to set auth token:', error);
    return false;
  }
}

/**
 * Clear all auth tokens from storage
 */
export function clearAuthToken(): void {
  if (!isBrowser()) return;
  
  // Clear cookies
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
  
  // Clear localStorage
  localStorage.removeItem('auth_token');
}

/**
 * Add the auth token to a fetch request
 */
export function addAuthToRequest(init: RequestInit = {}): RequestInit {
  const token = getAuthToken();
  if (!token) return init;
  
  // Create headers if they don't exist
  const headers = new Headers(init.headers || {});
  
  // Add token to Authorization header
  headers.set('Authorization', `Bearer ${token}`);
  
  return {
    ...init,
    headers
  };
}

/**
 * Fetch with authentication
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, addAuthToRequest(init));
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Navigate to auth token page to set up test authentication
 */
export function setupTestAuth(): void {
  if (!isBrowser()) return;
  
  // Display a message to the user before redirecting
  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth] Setting up test authentication...');
    alert('Setting up test authentication mode. You will be redirected.');
  }
  
  window.location.href = '/auth/test-token';
} 