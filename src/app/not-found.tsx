'use client';

import Link from 'next/link';
import { shouldUseFallback } from './cloudflare-fallback';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [isCloudflare, setIsCloudflare] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isCfPages = hostname.includes('pages.dev') || shouldUseFallback();
      setIsCloudflare(isCfPages);
      
      console.log('[404] Environment check:', { hostname, isCloudflare: isCfPages });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h2>
        
        {isCloudflare && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-left">
            <p className="text-amber-800 text-sm font-medium">Cloudflare Pages Environment</p>
            <p className="text-amber-700 text-xs mt-1">
              This application is running on Cloudflare Pages and has limited functionality.
              API routes and server-side features might not be available.
            </p>
            <p className="text-amber-700 text-xs mt-2">
              Try navigating to a static page or accessing the demo content.
            </p>
          </div>
        )}
        
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link 
            href="/"
            className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Go Home
          </Link>
          
          {isCloudflare && (
            <Link 
              href="/plans"
              className="px-6 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
            >
              Demo Content
            </Link>
          )}
        </div>
      </div>
    </div>
  );
} 