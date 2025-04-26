import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="max-w-2xl mx-auto py-16 text-center text-gray-500">Loading profile...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="max-w-2xl mx-auto py-16 text-center text-red-500">You must be signed in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="flex flex-col items-center bg-white rounded-lg shadow p-8">
        {user.image ? (
          <img src={user.image} alt={user.name} className="w-24 h-24 rounded-full object-cover border mb-4" />
        ) : (
          <span className="inline-flex w-24 h-24 items-center justify-center rounded-full bg-indigo-500 text-white text-3xl font-bold border mb-4">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </span>
        )}
        <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
        <p className="text-gray-600 mb-4">{user.email}</p>
        {/* Add more profile management actions here if needed */}
      </div>
    </div>
  );
} 