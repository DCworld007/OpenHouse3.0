'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { shouldUseFallback } from '../cloudflare-fallback';

// Define user type
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Define auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credential: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => null,
  logout: async () => {},
  refreshUser: async () => null,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component props
interface AuthProviderProps {
  children: ReactNode;
}

// Provider component that wraps the app and makes auth available to any child component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Function to create a demo user for fallback mode
  const createDemoUser = (): User => {
    console.log("[AuthContext] Creating demo user for fallback mode");
    return {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User',
      picture: 'https://via.placeholder.com/150'
    };
  };

  // Function to fetch the current user
  const fetchUser = async (): Promise<User | null> => {
    try {
      // In Cloudflare fallback mode, return demo user
      const fallbackMode = shouldUseFallback();
      console.log("[AuthContext] Checking Cloudflare fallback mode:", fallbackMode);
      
      if (fallbackMode) {
        console.log("[AuthContext] Using demo user in fallback mode");
        const demoUser = createDemoUser();
        setUser(demoUser);
        setIsLoading(false);
        return demoUser;
      }

      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          return data.user;
        } else {
          setUser(null);
          return null;
        }
      } else {
        console.log("[AuthContext] Auth API failed with status:", res.status);
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle login
  const login = async (credential: string): Promise<User | null> => {
    try {
      // In Cloudflare fallback mode, simulate successful login
      if (shouldUseFallback()) {
        console.log("[AuthContext] Using demo login in fallback mode");
        const demoUser = createDemoUser();
        setUser(demoUser);
        return demoUser;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ credential })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user;
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Function to handle logout
  const logout = async (): Promise<void> => {
    try {
      if (shouldUseFallback()) {
        setUser(null);
        router.push('/auth/login');
        return;
      }

      await fetch('/api/auth/logout', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Value to provide to children
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 