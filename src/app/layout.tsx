import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navigation from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';
import ClientWrapper from '@/components/ClientWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'UnifyPlan - Collaborative Planning Made Simple',
  description: "Collaborate, organize, and plan together in real-time. Whether it's house hunting, event planning, or project management - UnifyPlan brings everyone together.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.className} h-full`}>
        <ClientWrapper>
          <Navigation />
          <main>{children}</main>
          <Toaster />
        </ClientWrapper>
      </body>
    </html>
  );
} 