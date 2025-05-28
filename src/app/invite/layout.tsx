import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Planning Room - UnifyPlan',
  description: 'Join a planning room to collaborate with others',
  openGraph: {
    title: 'Join Planning Room - UnifyPlan',
    description: 'Join a planning room to collaborate with others',
    type: 'website',
    siteName: 'UnifyPlan'
  }
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 