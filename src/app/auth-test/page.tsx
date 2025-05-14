'use client';

import { useState, useEffect } from 'react';

export default function AuthTest() {
  const [authState, setAuthState] = useState<any>(null);
  const [debugCookies, setDebugCookies] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Test auth endpoint
        const authResponse = await fetch('/api/auth/me');
        const authData = await authResponse.json();
        setAuthState(authData);
        
        // Test debug cookies endpoint
        const cookiesResponse = await fetch('/api/auth/debug-cookies');
        const cookiesData = await cookiesResponse.json();
        setDebugCookies(cookiesData);
        
        setError(null);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      {loading ? (
        <p>Loading authentication state...</p>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Authentication State</h2>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              <pre>{JSON.stringify(authState, null, 2)}</pre>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Cookie Debug Information</h2>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              <pre>{JSON.stringify(debugCookies, null, 2)}</pre>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Browser Cookies</h2>
            <p className="mb-2">Current cookies in document (client-side only):</p>
            <div className="bg-gray-100 p-4 rounded">
              <code>{document.cookie || 'No cookies'}</code>
            </div>
          </div>
          
          <div className="mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh Test
            </button>
          </div>
        </>
      )}
    </div>
  );
} 