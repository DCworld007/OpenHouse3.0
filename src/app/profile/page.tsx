import { useUser } from '@auth0/nextjs-auth0/client';

export default function ProfilePage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="max-w-2xl mx-auto py-16 text-center text-gray-500">Loading profile...</div>;
  }

  if (!user) {
    return <div className="max-w-2xl mx-auto py-16 text-center text-red-500">You must be signed in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="flex flex-col items-center bg-white rounded-lg shadow p-8">
        {user.picture ? (
          <img src={user.picture} alt={user.name || 'User'} className="w-24 h-24 rounded-full object-cover border mb-4" />
        ) : (
          <span className="inline-flex w-24 h-24 items-center justify-center rounded-full bg-indigo-500 text-white text-3xl font-bold border mb-4">
            {(user.name || '?').split(' ').map(n => n[0]).join('').toUpperCase()}
          </span>
        )}
        <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
        <p className="text-gray-600 mb-4">{user.email}</p>
        {/* Add more profile management actions here if needed */}
      </div>
    </div>
  );
} 