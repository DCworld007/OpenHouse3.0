"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the base URL for API calls
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[LoginPage] document.cookie:', document.cookie);
      console.log('[LoginPage] pathname:', pathname);
      console.log('[LoginPage] NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
      console.log('[LoginPage] Base URL:', getBaseUrl());
    }

    // If already logged in, redirect to callbackUrl or /plans
    if (typeof window !== 'undefined') {
      // Check authentication by calling /api/healthcheck
      fetch(`${getBaseUrl()}/api/healthcheck`, { credentials: 'include' })
        .then(res => {
          if (res.ok) {
            console.log('[LoginPage] Health check passed');
            // Only redirect if we're really authenticated
            fetch(`${getBaseUrl()}/api/test`, { credentials: 'include' })
              .then(testRes => {
                if (testRes.ok) {
                  const params = new URLSearchParams(window.location.search);
                  const callbackUrl = params.get('callbackUrl');
                  window.location.href = (callbackUrl && typeof callbackUrl === 'string') ? callbackUrl : '/plans';
                }
              });
          } else {
            console.log('[LoginPage] Health check failed:', res.status);
          }
        })
        .catch(error => {
          console.error('[LoginPage] Error checking health status:', error);
        });
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
              const loginUrl = `${getBaseUrl()}/api/auth/login-simplified`;
              console.log('[LoginPage] Sending login request to:', loginUrl);
              
              const res = await fetch(loginUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                // Verify authentication worked by calling /api/test
                const meRes = await fetch(`${getBaseUrl()}/api/test`, { credentials: 'include' });
                console.log('[LoginPage] /api/test response status:', meRes.status);
                
                if (meRes.ok) {
                  const params = new URLSearchParams(window.location.search);
                  const callbackUrl = params.get('callbackUrl');
                  window.location.href = (callbackUrl && typeof callbackUrl === 'string') ? callbackUrl : '/plans';
                } else {
                  setError('Login failed - could not verify authentication');
                }
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
      <div className="m-auto w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to continue to UnifyPlan
              </p>
            </div>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
            </div>
            
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex justify-center text-sm">
                <p className="text-gray-500">
                  Don't have an account?{' '}
                  <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Create one
                  </Link>
                </p>
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
                Collaborate, organize, and plan together
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