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
  
  return (
    <AuthProvider>{children}</AuthProvider>
  );
};

export default ClientWrapper; 