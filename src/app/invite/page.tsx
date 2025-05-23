'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthDomain, shouldRedirectToMainAuth } from '@/utils/auth-config';

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

  // Effect to set default meta tags on initial load and when roomNameForMeta changes
  useEffect(() => {
    const defaultTitle = 'UnifyPlan Invite';
    const defaultDescription = 'You have been invited to join a collaborative planning room on UnifyPlan.';
    const title = roomNameForMeta ? `🗂️ ${roomNameForMeta} – Collaborative Plan` : defaultTitle;
    const description = roomNameForMeta 
      ? `Join this planning room (${roomNameForMeta}) to review ideas, vote on options, and chat live with your group.`
      : defaultDescription;

    document.title = title; // Also set the page title
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('description', description, 'name');
    // You can add more tags like og:image, og:url, twitter:card, etc.
    // For og:url, you might want to use the current window.location.href
    if (typeof window !== 'undefined') {
        setMetaTag('og:url', window.location.href);
    }
    // Example for a static image (replace with your actual image URL)
    // setMetaTag('og:image', 'https://yourdomain.com/path-to-your-logo-or-preview-image.png');

  }, [roomNameForMeta]);

  useEffect(() => {
    let isSubscribed = true;
    
    async function handleInvite() {
      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Try to get invite details for meta tags
        try {
          const preliminaryInviteDetails = await getInviteDetails(token);
          if (preliminaryInviteDetails && preliminaryInviteDetails.roomName && isSubscribed) {
            setRoomNameForMeta(preliminaryInviteDetails.roomName);
          }
        } catch (e) {
          console.warn('[InvitePage] Failed to get preliminary invite details for meta tags:', e);
        }

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
          sessionStorage.setItem('pendingInviteToken', token);
          const returnTo = `/invite?token=${token}`;
          router.push(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        // Clear the pending token since we're now processing it
        sessionStorage.removeItem('pendingInviteToken');

        // Get invite details after authentication
        const inviteDetails = await getInviteDetails(token);
        if (isSubscribed && inviteDetails.roomName && !roomNameForMeta) {
          setRoomNameForMeta(inviteDetails.roomName);
        }
        
        if (!inviteDetails || !inviteDetails.roomId) {
          throw new Error('Invalid invite details');
        }

        const joinResult = await joinRoom(token);
        if (!joinResult || !joinResult.room?.id) {
          console.error('[Invite] Invalid join result:', joinResult);
          throw new Error('Failed to join room - missing room ID in response');
        }

        if (isSubscribed) {
          const roomUrl = `/planning-room/${joinResult.room.id}`;
          console.log('[Invite] Redirecting to room:', roomUrl);
          
          // Add a message if user was already a member
          if (joinResult.room.alreadyMember) {
            console.log('[Invite] User was already a member of this room');
          }
          
          // Ensure we're using the correct room ID from the invite details
          const finalRoomUrl = `/planning-room/${inviteDetails.roomId}`;
          console.log('[Invite] Final redirect URL:', finalRoomUrl);
          router.push(finalRoomUrl);
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
  }, [token, router, roomNameForMeta]);

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