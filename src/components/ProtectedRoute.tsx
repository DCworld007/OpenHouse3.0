import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    // Removed Clerk useAuth hook and related logic
  }, [router]);

  return (
    <div>
      {children}
    </div>
  );
} 