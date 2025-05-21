'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/utils/jwt';

function getBaseUrl() {
  if (typeof window === 'undefined') return '';
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  return window.location.origin;
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
      throw new Error('Failed to fetch invite details');
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
      throw new Error('Failed to join room');
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
          const returnUrl = `/invite?token=${token}`;
          router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`);
          return;
        }

        // If user is authenticated, try to join the room
        const joinResult = await joinRoom(token);
        
        if (!joinResult || !joinResult.roomId) {
          throw new Error('Failed to join room');
        }

        // Redirect to the planning room
        router.push(`/planning-room/${joinResult.roomId}`);
      } catch (error) {
        console.error('Invite error:', error);
        // Handle invalid or expired invites
        router.push(`/?error=${encodeURIComponent('Invalid or expired invite link')}`);
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