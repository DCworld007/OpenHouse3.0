export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // For server-side
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
         'http://localhost:3000';
} 