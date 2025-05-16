'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { shouldUseFallback } from '../cloudflare-fallback';

interface EnvContextType {
  isCloudflare: boolean;
  hostname: string;
  isDevelopment: boolean;
}

const EnvContext = createContext<EnvContextType>({
  isCloudflare: false,
  hostname: '',
  isDevelopment: false,
});

export const useEnv = () => useContext(EnvContext);

export function EnvProvider({ children }: { children: ReactNode }) {
  const [env, setEnv] = useState<EnvContextType>({
    isCloudflare: false,
    hostname: '',
    isDevelopment: process.env.NODE_ENV === 'development',
  });

  useEffect(() => {
    // Client-side environment detection
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isCloudflare = shouldUseFallback();
      
      // Force debug mode in localStorage for local development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        try {
          localStorage.setItem('debug_cloudflare', 'true');
          console.log('[EnvContext] Force-enabled Cloudflare debug mode for local development');
        } catch (e) {
          console.error('[EnvContext] Failed to set localStorage:', e);
        }
      }
      
      setEnv({
        isCloudflare,
        hostname,
        isDevelopment: process.env.NODE_ENV === 'development',
      });
      
      console.log('[EnvContext] Environment context initialized:', { 
        isCloudflare, 
        hostname,
        isDevelopment: process.env.NODE_ENV === 'development'
      });
    }
  }, []);

  return (
    <EnvContext.Provider value={env}>
      {children}
    </EnvContext.Provider>
  );
} 