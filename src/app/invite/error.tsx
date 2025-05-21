'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Invite page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-lg rounded-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong!</h2>
          <p className="text-gray-600 mb-4">
            {error.message || 'There was an error processing your invite.'}
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-4">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-col space-y-4">
          <button
            onClick={reset}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
} 