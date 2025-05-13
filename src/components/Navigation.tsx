'use client';

import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

// Define local user type for the component
interface UserType {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Plans', href: '/plans' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function UserAvatar({ user }: { user: UserType }) {
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
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white font-bold border">
      {initials}
    </span>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
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
                {isLoading ? null : user ? (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <UserAvatar user={user as UserType} />
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
                        {user && (
                          <div className="px-4 py-2 text-sm text-gray-700">
                            <div className="font-bold">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        )}
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
                  <Link href="/auth/login" className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition">
                    Sign In
                  </Link>
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