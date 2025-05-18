'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UserDebug() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 p-3 bg-yellow-100 border border-yellow-300 rounded shadow-lg">
        <p className="text-sm font-medium text-yellow-800">Loading authentication...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="fixed bottom-4 right-4 p-3 bg-red-100 border border-red-300 rounded shadow-lg">
        <p className="text-sm font-medium text-red-800">Not authenticated</p>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col items-end">
        {isOpen && (
          <div className="mb-2 p-4 bg-white border border-gray-200 rounded shadow-lg w-80">
            <h3 className="text-lg font-bold mb-2">User Info</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(user, null, 2)}
            </pre>
            <div className="mt-3 text-xs text-gray-500">
              <p>isAuthenticated: {isAuthenticated.toString()}</p>
              <p>isLoading: {isLoading.toString()}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-green-100 border border-green-300 rounded shadow-lg flex items-center"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          <span className="text-sm font-medium text-green-800">
            {isOpen ? 'Hide Details' : 'Authenticated'}
          </span>
        </button>
      </div>
    </div>
  );
} 