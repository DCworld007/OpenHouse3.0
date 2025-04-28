"use client";

import Link from "next/link";

export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold text-center">Sign in to your account</h2>
        <a
          href="/api/auth/login"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Sign in with Auth0
        </a>
        <div className="text-center mt-4">
          <Link href="/auth/signup" className="text-indigo-600 hover:underline">
            Or create a new account
            </Link>
        </div>
      </div>
    </div>
  );
} 