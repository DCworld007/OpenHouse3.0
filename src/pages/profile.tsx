'use client';

import { useUser, UserButton } from '@clerk/nextjs';

export default function ProfilePage() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <div>Please sign in to view your profile.</div>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <div className="flex items-center gap-4 mb-4">
        <UserButton afterSignOutUrl="/" />
        <div>
          <div className="font-semibold text-lg">{user.fullName}</div>
          <div className="text-gray-600">{user.primaryEmailAddress?.emailAddress}</div>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-gray-700">User ID: <span className="font-mono">{user.id}</span></p>
      </div>
    </div>
  );
} 