export function isOnLoginPage() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, ''); // remove trailing slash
  return path === '/auth/login';
} 