import { Metadata } from 'next';
import { headers } from 'next/headers';

type Props = {
  params: { token?: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

async function getRoomDetails(token: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/invite/${token}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch room details');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching room details:', error);
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const token = searchParams.token as string;
  
  let roomName = 'UnifyPlan';
  if (token) {
    const roomDetails = await getRoomDetails(token);
    if (roomDetails?.roomName) {
      roomName = roomDetails.roomName;
    }
  }

  const ogImageUrl = new URL('/api/og', baseUrl);
  ogImageUrl.searchParams.set('roomName', roomName);

  const title = `🗂️ ${roomName} – Collaborative Plan`;
  const description = 'Join this planning room to review ideas, vote on options, and chat live with your group.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'UnifyPlan',
      images: [{
        url: ogImageUrl.toString(),
        width: 1200,
        height: 630,
        alt: `${roomName} Planning Room`
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl.toString()],
    },
    metadataBase: new URL(baseUrl),
  };
}

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 