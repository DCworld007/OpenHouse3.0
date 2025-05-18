"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginDebugPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<Record<string, any>>({});
  
  // Get the base URL for API calls
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const testApi = async (endpoint: string) => {
    try {
      const url = `${getBaseUrl()}${endpoint}`;
      console.log(`Testing API: ${url}`);
      
      const start = Date.now();
      const res = await fetch(url, { 
        credentials: 'include',
        // Add a cache-busting parameter
        headers: { 'Cache-Control': 'no-cache' }
      });
      const time = Date.now() - start;
      
      let data: any = null;
      let text = '';
      
      try {
        text = await res.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        console.error(`Error parsing response from ${endpoint}:`, e);
      }
      
      return {
        endpoint,
        status: res.status,
        ok: res.ok,
        time,
        data,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      };
    } catch (e) {
      console.error(`Error testing ${endpoint}:`, e);
      return {
        endpoint,
        error: e instanceof Error ? e.message : String(e),
        ok: false
      };
    }
  };

  const runApiTests = async () => {
    setApiStatus(prev => ({ ...prev, testing: true }));
    
    const results = {
      direct: await testApi('/direct'),
      me: await testApi('/me'),
      login: await testApi('/login')
    };
    
    setApiStatus({ ...results, testing: false, lastTested: new Date().toISOString() });
  };

  useEffect(() => {
    // Basic environment info
    if (typeof window !== 'undefined') {
      console.log('[LoginPage] document.cookie:', document.cookie);
      console.log('[LoginPage] pathname:', pathname);
      console.log('[LoginPage] NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
      console.log('[LoginPage] Base URL:', getBaseUrl());
      
      // Run API tests on load
      runApiTests();
    }

    // Load Google Identity Services script
    if (!window.google && !document.getElementById('google-identity')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-identity';
      document.body.appendChild(script);
    }

    // Wait for script to load, then render button
    const interval = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            console.log('[LoginPage] Google Sign-In response:', response);
            setLoading(true);
            setError(null);
            
            // Send ID token to API
            try {
              const loginUrl = `${getBaseUrl()}/login`;
              console.log('[LoginPage] Sending login request to:', loginUrl);
              
              const res = await fetch(loginUrl, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache'
                },
                credentials: 'include',
                body: JSON.stringify({ credential: response.credential })
              });
              
              console.log('[LoginPage] Login response status:', res.status);
              
              // Try to parse response as JSON, but handle if it's not valid JSON
              let data;
              try {
                const text = await res.text();
                console.log('[LoginPage] Login response text:', text);
                data = text ? JSON.parse(text) : {};
              } catch (parseError) {
                console.error('[LoginPage] Error parsing response:', parseError);
                throw new Error(`Failed to parse server response: ${parseError}`);
              }
              
              console.log('[LoginPage] Login response data:', data);
              
              if (res.ok) {
                // Run API tests again to check auth state
                await runApiTests();
                // Don't redirect automatically in debug mode
                setError('Login successful! Check API status below.');
              } else {
                setError('Login failed: ' + (data.error || `Server error: ${res.status}`));
              }
            } catch (error) {
              console.error('[LoginPage] Login error:', error);
              setError(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
              setLoading(false);
            }
          },
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'outline', size: 'large', width: 320 }
        );
        
        clearInterval(interval);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="m-auto w-full max-w-3xl p-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">Welcome back (Debug Mode)</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to continue to UnifyPlan
              </p>
            </div>
            
            {error && (
              <div className={`mb-4 px-4 py-3 rounded ${
                error.includes('successful') 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}
            
            <div className="space-y-4 flex flex-col items-center">
              <div id="google-signin-btn" className="w-full flex justify-center"></div>
              
              {loading && (
                <div className="mt-4 flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              )}
              
              <div className="w-full mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">API Status</h3>
                <button 
                  onClick={runApiTests}
                  className="mb-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
                  disabled={apiStatus.testing}
                >
                  {apiStatus.testing ? 'Testing...' : 'Test APIs Again'}
                </button>
                
                {apiStatus.lastTested && (
                  <p className="text-xs text-gray-500 mb-4">
                    Last tested: {apiStatus.lastTested}
                  </p>
                )}
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {['direct', 'me', 'login'].map(endpoint => {
                        const result = apiStatus[endpoint];
                        if (!result) return null;
                        
                        return (
                          <tr key={endpoint}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.endpoint}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                result.ok 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {result.status || 'Error'} 
                                {result.time && ` (${result.time}ms)`}
                              </span>
                              {result.error && <p className="text-red-500 text-xs mt-1">{result.error}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">
                              {result.data ? (
                                <pre className="text-xs overflow-x-auto max-w-xs">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              ) : (
                                result.text || 'No data'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex justify-center space-x-4 text-sm">
                <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Regular Login
                </Link>
                <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Create Account
                </Link>
                <Link href="/plans" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Skip to Plans
                </Link>
              </div>
            </div>
          </div>
          <div className="relative h-32 bg-indigo-600">
            <div className="absolute inset-0 opacity-20">
              <svg className="h-full w-full" viewBox="0 0 720 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H720V240H0V0Z" fill="url(#paint0_linear)" />
                <defs>
                  <linearGradient id="paint0_linear" x1="360" y1="0" x2="360" y2="240" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="relative h-full flex items-center justify-center">
              <p className="text-xl font-semibold text-white">
                Debugging API endpoints
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} UnifyPlan. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
} 