import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    clientInfo: {
      howTo: "Copy this code to your browser console to debug cookies",
      code: `
// Debug cookies
function debugAuth() {
  console.log('Current cookies:', document.cookie);
  
  // Test auth endpoints
  fetch('/api/auth/me')
    .then(res => res.json())
    .then(data => console.log('Auth Me endpoint:', data))
    .catch(err => console.error('Error with auth endpoint:', err));
    
  // Test debug endpoint
  fetch('/api/auth/debug-cookies')
    .then(res => res.json())
    .then(data => console.log('Debug cookies endpoint:', data))
    .catch(err => console.error('Error with debug endpoint:', err));
}

debugAuth();
      `
    }
  });
} 