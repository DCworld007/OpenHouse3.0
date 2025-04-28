import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isAuthenticated = document.cookie.includes('auth0');
  if (!isAuthenticated) {
        router.push('/api/auth/login');
  }
    }
  }, [router]);

  return <>{children}</>;
} 