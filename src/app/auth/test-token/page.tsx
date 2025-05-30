'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/utils/auth-client';

export default function TestTokenPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Setting up token...');
  
  useEffect(() => {
    try {
      // This token is properly signed with the test secret
      const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNzAxMzg4ODAwLCJpc3MiOiJvcGVuaG91c2UzIiwiYXVkIjoib3BlbmhvdXNlMy11c2VycyIsImV4cCI6MTk1NjUyODAwMH0.MAyJJetr0pPfAnBw8J_fZi3O3Wdr4NfVJfD5AmXHjSI";
      
      // Use the auth client to set tokens
      const success = setAuthToken(testToken, 7); // 7 days expiry
      
      if (success) {
        setMessage('Tokens set successfully. Redirecting...');
        
        // Verify tokens were set
        setTimeout(() => {
          const cookies = document.cookie;
          const hasToken = cookies.includes('token=') || cookies.includes('auth_token=');
          const hasLocalStorage = localStorage.getItem('auth_token') || localStorage.getItem('token');
          
          if (!hasToken && !hasLocalStorage) {
            setMessage('Warning: Failed to verify tokens were set. Continuing anyway...');
          }
          
          // Redirect after a short delay
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }, 500);
      } else {
        throw new Error('Failed to set auth tokens');
      }
    } catch (error) {
      setMessage(`Error setting token: ${error instanceof Error ? error.message : String(error)}`);
      
      // Add retry button
      const retryButton = document.createElement('button');
      retryButton.textContent = 'Retry';
      retryButton.onclick = () => window.location.reload();
      document.body.appendChild(retryButton);
    }
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
        <p className="mb-4">{message}</p>
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            {message.includes('Error') 
              ? 'Click retry below or refresh the page to try again.'
              : 'You will be redirected to the homepage automatically...'}
          </p>
          {message.includes('Error') && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 