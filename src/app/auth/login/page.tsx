"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { setupTestAuth } from '@/utils/auth-client';
import { shouldRedirectToMainAuth, getAuthRedirectUrl, getAuthDomain, getLoginCallbackUrl } from '@/utils/auth-config';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [clientIdValid, setClientIdValid] = useState(true);
  const [originIssue, setOriginIssue] = useState(false);
  
  // Get the base URL for API calls
  const getBaseUrl = () => {
    return getAuthDomain();
  };

  useEffect(() => {
    // Check if we need to redirect to main domain for auth
    if (shouldRedirectToMainAuth()) {
      const redirectUrl = getAuthRedirectUrl();
      console.log('[LoginPage] Redirecting to main auth domain:', redirectUrl);
      window.location.href = redirectUrl;
      return;
    }

    if (typeof window !== 'undefined') {
      setIsDevMode(process.env.NODE_ENV === 'development');
      
      console.log('[LoginPage] document.cookie:', document.cookie);
      console.log('[LoginPage] pathname:', pathname);
      console.log('[LoginPage] NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
      console.log('[LoginPage] Base URL:', getBaseUrl());
      
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'test_client_id' || clientId.includes('your_client_id')) {
        console.warn('[LoginPage] Invalid Google client ID detected:', clientId);
        setClientIdValid(false);
      }
    }

    // If already logged in, redirect to callbackUrl or /plans
    if (typeof window !== 'undefined') {
      const checkAuthAndRedirect = async () => {
        try {
          const meRes = await fetch(`${getBaseUrl()}/api/me`, { 
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (meRes.ok) {
            const data = await meRes.json();
            if (data.authenticated) {
              console.log('[LoginPage] User already authenticated, getting callback URL');
              const callbackUrl = getLoginCallbackUrl();
              console.log('[LoginPage] Redirecting to:', callbackUrl);
              
              // Wait for auth to be fully established
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Verify authentication one more time
              const verifyRes = await fetch(`${getBaseUrl()}/api/me`, { 
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData.authenticated) {
                  window.location.href = callbackUrl;
                }
              }
            }
          }
        } catch (error) {
          console.error('[LoginPage] Error checking auth status:', error);
        }
      };

      checkAuthAndRedirect();
    }

    // Load Google Identity Services script
    if (clientIdValid && !window.google && !document.getElementById('google-identity')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-identity';
      script.onerror = () => {
        console.error('[LoginPage] Failed to load Google Identity script');
        setError('Failed to load Google authentication. Please try the test authentication option.');
        setClientIdValid(false);
      };
      document.body.appendChild(script);
    }

    // Listen for Google origin errors
    const handleGsiError = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'string' && event.data.includes('GSI_LOGGER')) {
        if (event.data.includes('origin is not allowed') || event.data.includes('not allowed for the given client ID')) {
          console.error('[LoginPage] Google origin error detected:', event.data);
          setOriginIssue(true);
        }
      }
    };
    
    window.addEventListener('message', handleGsiError);

    // Wait for script to load, then render button
    const interval = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              console.log('[LoginPage] Google Sign-In response:', response);
              setLoading(true);
              setError(null);
              
              try {
                const loginUrl = `${getBaseUrl()}/api/auth/login`;
                console.log('[LoginPage] Sending login request to:', loginUrl);
                
                const res = await fetch(loginUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ credential: response.credential })
                });
                
                console.log('[LoginPage] Login response status:', res.status);
                
                let data;
                try {
                  const text = await res.text();
                  console.log('[LoginPage] Login response text:', text);
                  data = text ? JSON.parse(text) : {};
                } catch (parseError) {
                  console.error('[LoginPage] Error parsing response:', parseError);
                  throw new Error(`Failed to parse server response: ${parseError}`);
                }
                
                if (res.ok) {
                  try {
                    console.log('[LoginPage] Creating user in database...');
                    const userRes = await fetch(`${getBaseUrl()}/api/auth/user`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include'
                    });
                    
                    if (!userRes.ok) {
                      const errorText = await userRes.text();
                      console.error('[LoginPage] Failed to create user:', errorText);
                      setError('Failed to create user account');
                      return;
                    }

                    const userData = await userRes.json();
                    console.log('[LoginPage] User created/verified:', userData);

                    // Wait for auth to be established
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Verify authentication is established
                    const meRes = await fetch(`${getBaseUrl()}/api/me`, { 
                      credentials: 'include',
                      headers: { 'Cache-Control': 'no-cache' }
                    });
                    console.log('[LoginPage] /api/me response status:', meRes.status);
                    
                    if (meRes.ok) {
                      const meData = await meRes.json();
                      if (meData.authenticated) {
                        const callbackUrl = getLoginCallbackUrl();
                        console.log('[LoginPage] Authentication verified, redirecting to:', callbackUrl);
                        window.location.href = callbackUrl;
                      } else {
                        throw new Error('Authentication not established');
                      }
                    } else {
                      setError('Login failed - could not verify authentication');
                    }
                  } catch (error) {
                    console.error('[LoginPage] Error creating user:', error);
                    setError('Failed to create user account');
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
        } catch (err) {
          console.error('[LoginPage] Error initializing Google Sign-In:', err);
          setError('Failed to initialize Google Sign-In');
          setClientIdValid(false);
          clearInterval(interval);
        }
      }
    }, 100);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleGsiError);
    };
  }, [pathname, clientIdValid]);

  // Handle test authentication
  const handleTestAuth = () => {
    setupTestAuth();
  };

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
            
            {!clientIdValid && isDevMode && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                <p className="font-medium">Missing or invalid Google Client ID</p>
                <p className="text-sm mt-1">
                  You need to set up a valid NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.
                  See GOOGLE_AUTH_SETUP.md for instructions.
                </p>
              </div>
            )}
            
            {originIssue && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                <p className="font-medium">Google Sign-In Origin Issue</p>
                <p className="text-sm mt-1">
                  Your origin (localhost) is not allowed for this Google Client ID.
                  You need to add <code>http://localhost:3000</code> as an authorized JavaScript origin in the Google Cloud Console.
                </p>
              </div>
            )}
            
            <div className="space-y-4 flex flex-col items-center">
              {clientIdValid && !originIssue && <div id="google-signin-btn" className="w-full flex justify-center"></div>}
              
              {isDevMode && (
                <div className="mt-4 w-full">
                  <button
                    onClick={handleTestAuth}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Test Authentication (Dev Only)
                  </button>
                  <p className="mt-1 text-xs text-gray-500 text-center">
                    This option bypasses real login for development purposes
                  </p>
                </div>
              )}
              
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