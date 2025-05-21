'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/utils/jwt';
import { getAuthDomain } from '@/utils/auth-config';

function getBaseUrl() {
  return getAuthDomain();
}

async function checkAuth() {
  try {
    // Get token from cookies
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token=') || row.startsWith('auth_token='))
      ?.split('=')[1];
    
    if (!token) {
      return null;
    }

    const secret = await getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    
    return payload?.sub ? { id: payload.sub } : null;
  } catch (error) {
    console.error('Error checking auth:', error);
    return null;
  }
}

async function getInviteDetails(token: string) {
  try {
    const baseUrl = getBaseUrl();
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

    return await response.json();
  } catch (error) {
    console.error('Error fetching invite details:', error);
    throw error;
  }
}

async function joinRoom(token: string) {
  try {
    const baseUrl = getBaseUrl();
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

    return await response.json();
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || null;

  useEffect(() => {
    async function handleInvite() {
      if (!token) {
        router.push('/');
        return;
      }

      try {
        // Get invite details first to validate the token
        const inviteDetails = await getInviteDetails(token);
        
        if (!inviteDetails || !inviteDetails.roomId) {
          throw new Error('Invalid invite details');
        }

        // Check authentication
        const user = await checkAuth();
        if (!user) {
          const returnTo = `/invite?token=${token}`;
          router.push(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        // If user is authenticated, try to join the room
        const joinResult = await joinRoom(token);
        
        if (!joinResult || !joinResult.room?.id) {
          throw new Error('Failed to join room');
        }

        // Redirect to the planning room
        router.push(`/planning-room/${joinResult.room.id}`);
      } catch (error) {
        console.error('Invite error:', error);
        // Preserve the error message from the API
        const errorMessage = error instanceof Error ? error.message : 'Invalid or expired invite link';
        router.push(`/?error=${encodeURIComponent(errorMessage)}`);
      }
    }

    handleInvite();
  }, [token, router]);

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