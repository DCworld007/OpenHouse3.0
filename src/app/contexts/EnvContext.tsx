'use client';

import React, { createContext, useContext, ReactNode } from 'react';

type EnvContextType = {
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
};

// Default fallback values - using a known client ID that works with pages.dev domain
const defaultEnv: EnvContextType = {
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "199271440618-ispl5hhqcfsp89crgdpldc1kd7us3pud.apps.googleusercontent.com",
};

const EnvContext = createContext<EnvContextType>(defaultEnv);

export const useEnv = () => useContext(EnvContext);

export const EnvProvider = ({ children }: { children: ReactNode }) => {
  // Try to use the environment variables first, fall back to defaults
  const envValues: EnvContextType = {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || defaultEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  };

  return (
    <EnvContext.Provider value={envValues}>
      {children}
    </EnvContext.Provider>
  );
}; 