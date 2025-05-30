'use client';

import { Fragment, useEffect, useState } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { authFetch, clearAuthToken, getAuthToken, setupTestAuth } from '@/utils/auth-client';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Plans', href: '/plans' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function UserAvatar({ user }: { user: { name?: string; picture?: string | null } }) {
  if (user.picture) {
    return (
      <img
        className="h-8 w-8 rounded-full object-cover border"
        src={user.picture}
        alt={user.name || 'User'}
      />
    );
  }
  // Fallback: initials
  const initials = (user.name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white font-bold border">
      {initials}
    </span>
  );
}

export default function Navigation() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        console.log('Fetching user data...');
        // Get token from cookies or localStorage
        const token = getAuthToken();
        console.log('Auth token present:', !!token);
        
        // Use our auth fetch utility that adds the token to headers
        const res = await authFetch('/api/me');
        
        if (res.ok) {
          const data = await res.json();
          console.log('User data response:', data);
          
          // Check if the response has a nested user object or direct user fields
          if (data.authenticated && data.user) {
            // If it has the expected structure from our API route
            setUser(data.user);
          } else if (data.id || data.sub) {
            // If it has a direct user structure
            setUser({
              id: data.id || data.sub,
              name: data.name,
              email: data.email,
              picture: data.picture
            });
          } else {
            console.log('Invalid user data format:', data);
            setUser(null);
          }
        } else {
          console.log('Failed to fetch user:', res.status);
          setUser(null);
          
          // If user is not found and we're not on auth pages, redirect to test auth
          if (res.status === 401 && 
              !pathname.startsWith('/auth/') && 
              process.env.NODE_ENV === 'development') {
            console.log('Auto-redirecting to test auth page...');
            setupTestAuth();
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
    await fetch('/api/auth/logout', { method: 'POST' });
      // Clear all tokens
      clearAuthToken();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
      clearAuthToken();
    window.location.href = '/auth/login';
    }
  };

  return (
    <Disclosure as="nav" className="bg-white shadow">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center font-bold text-xl text-indigo-600">
                  <Link href="/">UnifyPlan</Link>
                </div>
                <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        pathname === item.href
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center">
                {loading ? (
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                ) : user ? (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <UserAvatar user={user} />
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-4 py-2 text-sm text-gray-700">
                          <div className="font-bold">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block w-full text-left px-4 py-2 text-sm text-red-600'
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <div className="space-x-2">
                    <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
                    Sign In
                  </Link>
                    {process.env.NODE_ENV === 'development' && (
                      <button 
                        onClick={() => setupTestAuth()}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition"
                      >
                        Test Auth
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as="a"
                  href={item.href}
                  className={classNames(
                    pathname === item.href
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800',
                    'block border-l-4 py-2 pl-3 pr-4 text-base font-medium'
                  )}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
} 