import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';

async function getBaseUrl() {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = headers().get('host') || '';
  return `${protocol}://${host}`;
}

async function getInviteDetails(token: string) {
  try {
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/invite/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/invite/${token}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

export default async function InvitePage({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const token = searchParams.token;
  const session = await getServerSession();

  if (!token) {
    redirect('/');
  }

  try {
    const inviteDetails = await getInviteDetails(token);
    
    // If user is not authenticated, redirect to sign-in with return URL
    if (!session) {
      const returnUrl = `/invite?token=${token}`;
      redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnUrl)}`);
    }

    // If user is authenticated, try to join the room
    const joinResult = await joinRoom(token);
    
    // Redirect to the planning room
    redirect(`/planning-room/${joinResult.roomId}`);
  } catch (error) {
    // Handle invalid or expired invites
    redirect(`/?error=${encodeURIComponent('Invalid or expired invite link')}`);
  }
} 