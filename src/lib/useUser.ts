import { useEffect, useState } from 'react';

export function useUser() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }
    fetchUser();
  }, []);
  return { user };
} 