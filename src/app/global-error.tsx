'use client';

import React from 'react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            
            <p className="text-gray-700 mb-6">
              We're sorry, but there was a critical error loading the application.
            </p>
            
            {process.env.NODE_ENV !== 'production' && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left overflow-auto">
                <p className="text-sm text-red-600 font-mono">{error.message}</p>
                {error.stack && (
                  <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => reset()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
              >
                Try again
              </button>
              <a 
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
              >
                Return to home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 