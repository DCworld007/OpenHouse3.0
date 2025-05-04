"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[LoginPage] document.cookie:', document.cookie);
      console.log('[LoginPage] pathname:', pathname);
      console.log('[LoginPage] NEXT_PUBLIC_GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    }
    // If already logged in, redirect to callbackUrl or /plans
    if (typeof window !== 'undefined' && document.cookie.includes('token=')) {
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callbackUrl');
      window.location.href = (callbackUrl && typeof callbackUrl === 'string') ? callbackUrl : '/plans';
      return;
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
            // Send ID token to API
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential })
            });
            if (res.ok) {
              const params = new URLSearchParams(window.location.search);
              const callbackUrl = params.get('callbackUrl');
              window.location.href = (callbackUrl && typeof callbackUrl === 'string') ? callbackUrl : '/plans';
            } else {
              alert('Login failed');
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
            <div className="space-y-4 flex flex-col items-center">
              <div id="google-signin-btn" className="w-full flex justify-center"></div>
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