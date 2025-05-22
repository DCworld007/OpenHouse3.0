'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthDomain, shouldRedirectToMainAuth } from '@/utils/auth-config';

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

  useEffect(() => {
    let isSubscribed = true;
    
    async function handleInvite() {
      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Check if we need to redirect to main domain for auth
        if (shouldRedirectToMainAuth()) {
          const currentUrl = `/invite?token=${token}`;
          const mainDomain = getAuthDomain();
          const redirectUrl = `${mainDomain}/auth/login?returnTo=${encodeURIComponent(currentUrl)}`;
          console.log('[Invite] Redirecting to main auth domain:', redirectUrl);
          window.location.href = redirectUrl;
          return;
        }

        // Check authentication first
        const user = await checkAuth();
        if (!user) {
          // Store the token in sessionStorage to prevent potential redirect loops
          sessionStorage.setItem('pendingInviteToken', token);
          const returnTo = `/invite?token=${token}`;
          router.push(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        // Clear any stored pending invite token
        sessionStorage.removeItem('pendingInviteToken');

        // Get invite details to validate the token
        const inviteDetails = await getInviteDetails(token);
        console.log('[Invite] Processing invite for room:', inviteDetails.roomId);
        
        if (!inviteDetails || !inviteDetails.roomId) {
          throw new Error('Invalid invite details');
        }

        // If user is authenticated and invite is valid, try to join the room
        const joinResult = await joinRoom(token);
        console.log('[Invite] Successfully joined room:', joinResult);
        
        if (!joinResult || !joinResult.room?.id) {
          console.error('[Invite] Invalid join result:', joinResult);
          throw new Error('Failed to join room - missing room ID in response');
        }

        // Redirect to the planning room
        if (isSubscribed) {
          const roomUrl = `/planning-room/${joinResult.room.id}`;
          console.log('[Invite] Redirecting to room:', roomUrl);
          router.push(roomUrl);
        }
      } catch (error) {
        console.error('Invite error:', error);
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
  }, [token, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex flex-col items-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700">Invite Error</h2>
            <p className="text-gray-500 mt-2 text-center">{error}</p>
            <button
              onClick={() => router.push('/plans')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Go to Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Processing Invite...</h2>
          <p className="text-gray-500 mt-2">Please wait while we verify your invite.</p>
        </div>
      </div>
    </div>
  );
} 