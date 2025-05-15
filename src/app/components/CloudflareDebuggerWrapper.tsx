'use client';

import dynamic from 'next/dynamic';

// Dynamically import the CloudflareDebugger with no SSR
const CloudflareDebugger = dynamic(() => import('../client-debug'), { 
  ssr: false,
  loading: () => null
});

export default function CloudflareDebuggerWrapper() {
  return <CloudflareDebugger />;
} 