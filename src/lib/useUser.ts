import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const currentPath = usePathname();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setIsLoading(false);
        } else {
          setUser(null);
          setIsLoading(false);
          
          // Only redirect to login if we're not already on the login page
          // and not on the home page
          if (currentPath && currentPath !== '/auth/login' && currentPath !== '/') {
            const returnUrl = encodeURIComponent(currentPath);
            router.push(`/auth/login?returnTo=${returnUrl}`);
          }
        }
      } catch {
        setUser(null);
        setIsLoading(false);
        
        // Only redirect to login if we're not already on the login page
        // and not on the home page
        if (currentPath && currentPath !== '/auth/login' && currentPath !== '/') {
          const returnUrl = encodeURIComponent(currentPath);
          router.push(`/auth/login?returnTo=${returnUrl}`);
        }
      }
    }
    fetchUser();
  }, [currentPath, router]);

  return { user, isLoading };
} 