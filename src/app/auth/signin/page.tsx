'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

export default function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/plan';
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          Open House Planner
        </h1>
        <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error === 'OAuthSignin' && 'Error signing in with Google. Please try again.'}
              {error === 'OAuthCallback' && 'Error completing sign in. Please try again.'}
              {error === 'OAuthCreateAccount' && 'Error creating account. Please try again.'}
              {error === 'EmailCreateAccount' && 'Error creating account. Please try again.'}
              {error === 'Callback' && 'Error signing in. Please try again.'}
              {error === 'Default' && 'Error signing in. Please try again.'}
            </div>
          )}

          <div className="space-y-6">
            <button
              onClick={() => signIn('google', { callbackUrl })}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Image
                src="/google.svg"
                alt="Google Logo"
                width={20}
                height={20}
                className="mr-2"
              />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 