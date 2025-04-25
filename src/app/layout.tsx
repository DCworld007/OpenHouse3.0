import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SessionProvider from '@/components/SessionProvider';
import Navigation from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UnifyPlan - Collaborative Planning Made Simple',
  description: "Collaborate, organize, and plan together in real-time. Whether it's house hunting, event planning, or project management - UnifyPlan brings everyone together.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.className} h-full`}>
        <SessionProvider session={session}>
          <div className="min-h-full">
            <Navigation />
            <main>{children}</main>
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
} 