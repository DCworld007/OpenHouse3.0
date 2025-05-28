'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthDomain, shouldRedirectToMainAuth } from '@/utils/auth-config';
import { getBaseUrl } from '@/lib/baseUrl';

// Helper function to set or update a meta tag
function setMetaTag(property: string, content: string, type: 'name' | 'property' = 'property') {
  if (typeof window === 'undefined') return;
  let element = document.querySelector(`meta[${type}='${property}']`) as HTMLMetaElement | null;
  if (element) {
    element.setAttribute('content', content);
  } else {
    element = document.createElement('meta');
    element.setAttribute(type, property);
    element.setAttribute('content', content);
    document.getElementsByTagName('head')[0].appendChild(element);
  }
}

function getBaseUrl() {
  return getAuthDomain();
}

async function checkAuth() {
  try {
    const response = await fetch('/api/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[InvitePage] /api/me checkAuth call not OK:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.authenticated && data.user?.id) {
      return { id: data.user.id };
    }
    return null;
  } catch (error) {
    console.error('[InvitePage] Error in checkAuth via /api/me:', error);
    return null;
  }
}

async function getInviteDetails(token: string) {
  try {
    const baseUrl = getBaseUrl();
    console.log('[Invite] Fetching invite details from:', baseUrl);
    
    const response = await fetch(`${baseUrl}/api/invite/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch invite details');
    }

    const data = await response.json();
    console.log('[Invite] Got invite details:', data);
    return data;
  } catch (error) {
    console.error('Error fetching invite details:', error);
    throw error;
  }
}

async function joinRoom(token: string) {
  try {
    const baseUrl = getBaseUrl();
    console.log('[Invite] Joining room with token at:', baseUrl);
    
    const response = await fetch(`${baseUrl}/api/invite/${token}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join room');
    }

    const data = await response.json();
    console.log('[Invite] Join room response:', data);
    return data;
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || null;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roomNameForMeta, setRoomNameForMeta] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function handleInvite() {
      if (!token) {
        setError('No invite token provided');
        setIsLoading(false);
        return;
      }

      try {
        // First check if user is authenticated
        const authResponse = await fetch('/api/me', {
          credentials: 'include'
        });
        
        const authData = await authResponse.json();
        
        if (!authData.authenticated) {
          // If not authenticated, redirect to login
          const currentUrl = window.location.href;
          const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentUrl)}`;
          window.location.href = loginUrl;
          return;
        }

        // Get invite details
        const inviteResponse = await fetch(`/api/invite/${token}`, {
          credentials: 'include'
        });

        if (!inviteResponse.ok) {
          const errorData = await inviteResponse.json();
          throw new Error(errorData.error || 'Invalid invite link');
        }

        const inviteDetails = await inviteResponse.json();
        
        if (!inviteDetails.roomId) {
          throw new Error('Invalid invite - no room ID found');
        }

        // Set room name for meta tags
        if (inviteDetails.roomName && isSubscribed) {
          setRoomNameForMeta(inviteDetails.roomName);
        }

        // Join the room
        const joinResponse = await fetch(`/api/invite/${token}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!joinResponse.ok) {
          const errorData = await joinResponse.json();
          throw new Error(errorData.error || 'Failed to join room');
        }

        const joinResult = await joinResponse.json();

        if (!joinResult || !joinResult.room?.id) {
          throw new Error('Failed to join room - missing room ID in response');
        }

        if (isSubscribed) {
          const roomId = joinResult.room.id;
          console.log('[Invite] Redirecting to room:', roomId);
          
          // Add a small delay to ensure all state updates are processed
          setTimeout(() => {
            if (isSubscribed) {
              // Force a hard navigation to ensure fresh state
              window.location.href = `/planning-room/${roomId}`;
            }
          }, 100);
        }
      } catch (error) {
        console.error('[Invite] Error:', error);
        if (isSubscribed) {
          setError(error instanceof Error ? error.message : 'Invalid or expired invite link');
          setIsLoading(false);
        }
      }
    }

    handleInvite();
    
    return () => {
      isSubscribed = false;
    };
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600">Invite Error</h2>
              <p className="mt-2 text-gray-600">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">Joining Room...</h2>
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 