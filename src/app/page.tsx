'use client';

import { useEffect, useState } from 'react';
import HomeFallback from './index-fallback';
import { shouldUseFallback } from './cloudflare-fallback';

// Simple client-side component that switches to fallback in Cloudflare Pages
export default function Home() {
  const [useFallback, setUseFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if we should use the fallback mode
    const checkFallback = () => {
      const isFallbackMode = shouldUseFallback();
      console.log("[Home] Fallback mode check:", isFallbackMode);
      
      // Force fallback mode for Cloudflare environment
      if (typeof window !== 'undefined') {
        // Always enable fallback for Cloudflare Pages
        if (window.location.hostname.includes('pages.dev')) {
          console.log("[Home] Forcing fallback mode for pages.dev domain");
          localStorage.setItem('debug_cloudflare', 'true');
          setUseFallback(true);
          return true;
        }
      }
      
      setUseFallback(isFallbackMode);
      return isFallbackMode;
    };
    
    // First render check
    const isFallback = checkFallback();
    setIsLoading(false);
    
    // If we're in Cloudflare Pages, never attempt to fetch real data
    if (isFallback) {
      console.log("[Home] Using fallback mode - no API requests will be made");
    }
  }, []);
  
  // Show loading state initially
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <p className="text-gray-500">Loading application...</p>
        </div>
      </div>
    );
  }
  
  // Always use fallback view for Cloudflare Pages deployments  
  if (useFallback) {
    return <HomeFallback />;
  }

  // Note: This part is only reached in local development or non-Cloudflare deployments
  return (
    <div className="py-10">
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-semibold">Welcome to UnifyPlan</h1>
            <p className="mt-2 text-gray-600">Please sign in to continue.</p>
            <div className="mt-4">
              <a
                href="/auth/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}