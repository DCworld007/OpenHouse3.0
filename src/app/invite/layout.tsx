import { Metadata } from 'next';

type Props = {
  params: { token?: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ogImageUrl = new URL('/api/og', baseUrl).toString();

  return {
    title: '🗂️ UnifyPlan – Collaborative Plan',
    description: 'Join this planning room to review ideas, vote on options, and chat live with your group.',
    openGraph: {
      title: '🗂️ UnifyPlan – Collaborative Plan',
      description: 'Join this planning room to review ideas, vote on options, and chat live with your group.',
      type: 'website',
      siteName: 'UnifyPlan',
      images: [{
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'UnifyPlan Collaborative Planning Room'
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: '🗂️ UnifyPlan – Collaborative Plan',
      description: 'Join this planning room to review ideas, vote on options, and chat live with your group.',
      images: [ogImageUrl],
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