'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { shouldUseFallback } from '../cloudflare-fallback';

// Dynamically import the CloudflareDebugger with no SSR
const CloudflareDebugger = dynamic(() => import('../client-debug'), { 
  ssr: false,
  loading: () => null
});

export default function ClientWrapperWithDebug({ 
  children 
}: { 
  children?: React.ReactNode 
}) {
  const [showDebugger, setShowDebugger] = useState(false);
  const [isCloudflare, setIsCloudflare] = useState(false);
  
  // Use useEffect to initialize and handle keyboard shortcuts
  useEffect(() => {
    // Check if we're in Cloudflare Pages environment
    const hostname = window.location.hostname;
    const isCloudflareHost = hostname.includes('pages.dev');
    const debugMode = localStorage.getItem('debug_cloudflare') === 'true';
    
    // Force Cloudflare fallback mode for unifyplanver2.pages.dev
    if (hostname === 'unifyplanver2.pages.dev' && !debugMode) {
      localStorage.setItem('debug_cloudflare', 'true');
      console.log('[ClientWrapperWithDebug] Forcing Cloudflare debug mode on unifyplanver2.pages.dev');
    }
    
    setIsCloudflare(isCloudflareHost || debugMode);
    
    // For Mac, we'll use Command+Option+D instead of Ctrl+Alt+D
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+Option+D (Mac) or Ctrl+Alt+D (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'd') {
        setShowDebugger(prev => !prev);
        // Store the preference in localStorage
        localStorage.setItem('show_debug', (!showDebugger).toString());
      }
    };
    
    // Check localStorage for previous setting
    const debugPreference = localStorage.getItem('show_debug') === 'true';
    setShowDebugger(debugPreference || isCloudflareHost); // Always show debugger on Cloudflare
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDebugger]);
  
  return (
    <>
      {children}
      {showDebugger && <CloudflareDebugger />}
      
      {/* Floating debug button */}
      <button
        onClick={() => {
          setShowDebugger(prev => !prev);
          localStorage.setItem('show_debug', (!showDebugger).toString());
        }}
        className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-full z-50 text-xs"
        title="Toggle Cloudflare Debugger (Cmd+Option+D)"
      >
        {showDebugger ? "Hide Debug" : "CF Debug"}
      </button>
      
      {/* Small badge to indicate Cloudflare mode */}
      {isCloudflare && (
        <div className="fixed top-0 right-0 bg-orange-500 text-white text-xs px-2 py-1 z-50 rounded-bl">
          Cloudflare Pages
        </div>
      )}
    </>
  );
} 