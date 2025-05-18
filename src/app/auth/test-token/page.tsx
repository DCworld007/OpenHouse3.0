'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestTokenPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Setting up token...');
  
  useEffect(() => {
    try {
      // First clear any existing tokens (cookies and localStorage)
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
      localStorage.removeItem('auth_token');
      
      // Set the token with proper attributes
      // This token is properly signed with the new secret "X7d4KjP9Rt6vQ8sFbZ2mEwHc5LnAaYpG3xNzVuJq"
      const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzAxMzg4ODAwLCJpc3MiOiJvcGVuaG91c2UzIiwiYXVkIjoib3BlbmhvdXNlMy11c2VycyIsImV4cCI6MTk1NjUyODAwMH0.MAyJJetr0pPfAnBw8J_fZi3O3Wdr4NfVJfD5AmXHjSI";
      
      // Try various cookie formats to maximize compatibility
      // Standard format
      document.cookie = `token=${testToken}; path=/; max-age=86400; SameSite=Lax`;
      
      // Try with domain attribute
      const domain = window.location.hostname;
      document.cookie = `token=${testToken}; path=/; domain=${domain}; max-age=86400; SameSite=Lax`;
      
      // Alternative cookie name
      document.cookie = `auth_token=${testToken}; path=/; max-age=86400; SameSite=Lax`;
      
      // Store in localStorage as fallback
      localStorage.setItem("auth_token", testToken);
      localStorage.setItem("debug_cloudflare", "true");
      
      // Log for debugging
      setMessage(`Tokens set. Current cookies: ${document.cookie}`);
      
      // Manual verification that cookies were set
      setTimeout(() => {
        const cookiesAfterSet = document.cookie;
        const hasToken = cookiesAfterSet.includes('token=');
        setMessage(`Token cookie ${hasToken ? 'successfully set' : 'FAILED to set'}. Will use localStorage fallback. Redirecting...`);
        
        // Redirect after a delay to allow cookies to take effect
        setTimeout(() => {
          // Navigate to home page
          router.push('/');
        }, 1000);
      }, 500);
    } catch (error) {
      setMessage(`Error setting token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
        <p className="mb-4">{message}</p>
        <div className="mt-4">
          <p className="text-sm text-gray-500">You will be redirected to the homepage automatically...</p>
        </div>
      </div>
    </div>
  );
} 