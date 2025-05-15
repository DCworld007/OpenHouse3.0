"use client";

import { useEffect } from 'react';
import { AuthProvider } from '@/app/contexts/AuthContext';

const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Move localStorage code here where it's safe to use browser APIs
    if (typeof window !== 'undefined') {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key: string, value: string) {
        console.log('[GLOBAL localStorage.setItem]', { key, value, stack: new Error().stack });
        return originalSetItem.call(this, key, value);
      };
    }
  }, []);
  
  // We'll try to wrap with AuthProvider, but catch any errors if it's not available
  try {
    return (
      <AuthProvider>{children}</AuthProvider>
    );
  } catch (error) {
    console.warn('AuthProvider not available, rendering without authentication');
    return <>{children}</>;
  }
};

export default ClientWrapper; 