'use client';

import { useEffect } from 'react';
import { shouldUseFallback } from './cloudflare-fallback';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('Application error:', error);
  }, [error]);

  const isCloudflare = typeof window !== 'undefined' && 
    (window.location.hostname.includes('pages.dev') || shouldUseFallback());

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        
        {isCloudflare && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-800 text-sm font-medium">Cloudflare Pages Environment Detected</p>
            <p className="text-amber-700 text-xs mt-1">
              This application is running in a limited environment on Cloudflare Pages.
              Some features might not be available.
            </p>
            <p className="text-amber-700 text-xs mt-2">
              Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'Server'}
            </p>
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            The application encountered an unexpected error. You can try refreshing the page or
            resetting the application state.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto max-h-40 text-xs">
              <p className="font-mono text-red-600">{error.message}</p>
              {error.stack && (
                <pre className="mt-2 text-gray-700 whitespace-pre-wrap">
                  {error.stack.split('\n').slice(1, 5).join('\n')}
                </pre>
              )}
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Go Home
          </button>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
} 