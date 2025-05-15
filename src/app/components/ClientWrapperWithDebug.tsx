'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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
  
  // Use useEffect to initialize and handle keyboard shortcuts
  useEffect(() => {
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
    setShowDebugger(debugPreference);
    
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
    </>
  );
} 