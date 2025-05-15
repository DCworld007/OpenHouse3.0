'use client';

import { useEffect, useState } from 'react';
import { shouldUseFallback } from './cloudflare-fallback';

interface DebugState {
  isCloudflare: boolean;
  apiStatus: string;
  lastApiError: string | null;
  hostname: string;
  usingFallback: boolean;
}

/**
 * A debug overlay component for troubleshooting Cloudflare Pages issues
 */
export default function CloudflareDebugger() {
  const [debug, setDebug] = useState<DebugState>({
    isCloudflare: false,
    apiStatus: 'Not tested',
    lastApiError: null,
    hostname: '',
    usingFallback: false
  });
  
  useEffect(() => {
    // Get initial state
    setDebug(state => ({
      ...state,
      isCloudflare: window.location.hostname.includes('pages.dev'),
      hostname: window.location.hostname,
      usingFallback: shouldUseFallback()
    }));
  }, []);
  
  // Test API connection
  const testApi = async () => {
    try {
      setDebug(state => ({ ...state, apiStatus: 'Testing...' }));
      
      const response = await fetch('/api/plans');
      const data = await response.json();
      
      if (response.ok) {
        setDebug(state => ({ 
          ...state, 
          apiStatus: `Success - ${response.status}`,
          lastApiError: null
        }));
      } else {
        setDebug(state => ({ 
          ...state, 
          apiStatus: `Error - ${response.status}`,
          lastApiError: JSON.stringify(data, null, 2)
        }));
      }
    } catch (error) {
      setDebug(state => ({ 
        ...state, 
        apiStatus: 'Exception',
        lastApiError: error instanceof Error ? error.message : String(error)
      }));
    }
  };
  
  // Toggle Cloudflare simulation in localStorage
  const toggleSimulation = () => {
    const newValue = !debug.usingFallback;
    localStorage.setItem('debug_cloudflare', newValue.toString());
    setDebug(state => ({ ...state, usingFallback: newValue }));
    // Reload the page to apply the setting
    window.location.reload();
  };
  
  return (
    <div className="fixed bottom-0 right-0 bg-black bg-opacity-80 text-white p-4 z-50 font-mono text-xs rounded-tl-lg max-w-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Cloudflare Pages Debugger</h3>
      </div>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Hostname: </span>
          <span>{debug.hostname}</span>
        </div>
        <div>
          <span className="text-gray-400">Cloudflare Pages: </span>
          <span className={debug.isCloudflare ? "text-green-500" : "text-yellow-500"}>
            {debug.isCloudflare ? "Yes" : "No"}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Using Fallback: </span>
          <span className={debug.usingFallback ? "text-green-500" : "text-yellow-500"}>
            {debug.usingFallback ? "Yes" : "No"}
          </span>
          <button 
            onClick={toggleSimulation}
            className="ml-2 text-xs bg-blue-700 hover:bg-blue-600 px-2 py-0.5 rounded"
          >
            {debug.usingFallback ? "Disable" : "Enable"}
          </button>
        </div>
        <div>
          <span className="text-gray-400">API Status: </span>
          <span 
            className={
              debug.apiStatus.includes('Success') ? "text-green-500" : 
              debug.apiStatus.includes('Error') || debug.apiStatus.includes('Exception') ? "text-red-500" : 
              "text-yellow-500"
            }
          >
            {debug.apiStatus}
          </span>
          <button 
            onClick={testApi}
            className="ml-2 text-xs bg-blue-700 hover:bg-blue-600 px-2 py-0.5 rounded"
          >
            Test API
          </button>
        </div>
        
        {debug.lastApiError && (
          <div className="mt-2">
            <div className="text-gray-400">Last Error:</div>
            <pre className="bg-gray-900 p-2 rounded overflow-auto max-h-40 text-red-400 mt-1">
              {debug.lastApiError}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 