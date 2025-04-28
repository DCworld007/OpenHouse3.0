'use client';

import { useUser } from '../../hooks/useUser';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading } = useUser();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded shadow max-w-md w-full text-center">
          <p className="mb-4 text-lg">You are not logged in.</p>
          <a href="/api/auth/login" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full flex flex-col items-center">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="h-20 w-20 rounded-full object-cover border mb-4" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-indigo-500 flex items-center justify-center text-white text-3xl font-bold mb-4">
            {user.name ? user.name[0].toUpperCase() : '?'}
          </div>
        )}
        <h1 className="text-2xl font-bold mb-1">{user.name}</h1>
        <div className="text-gray-600 mb-6">{user.email}</div>
        <div className="flex gap-4 w-full">
          <Link href="/" className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-center">Back to Home</Link>
          <a href="/api/auth/logout" className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-center">Log out</a>
        </div>
      </div>
    </div>
  );
} 