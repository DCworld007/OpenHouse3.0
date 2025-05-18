'use client';

import { useState, useEffect } from 'react';
import { useEnv } from '@/app/contexts/EnvContext';

export default function DebugGoogleAuth() {
  const env = useEnv();
  const [testResult, setTestResult] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setClientId(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
    }
  }, [env]);

  const testOriginValidity = async () => {
    try {
      // Create a form to test if the current origin is allowed
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = 'https://accounts.google.com/o/oauth2/v2/auth';
      form.target = '_blank';

      const appendInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      appendInput('client_id', clientId);
      appendInput('redirect_uri', `${origin}/auth/login`);
      appendInput('response_type', 'token');
      appendInput('scope', 'profile email openid');
      appendInput('include_granted_scopes', 'true');
      appendInput('state', 'test-state');

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      setTestResult('Test initiated. Check the popup window for results.');
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Google Authentication Debug</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Environment Information</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="font-medium">Current Origin:</p>
            <code className="bg-gray-100 p-2 rounded block mt-1">{origin}</code>
          </div>
          <div>
            <p className="font-medium">Google Client ID:</p>
            <code className="bg-gray-100 p-2 rounded block mt-1">{clientId || 'Not set'}</code>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Testing Tools</h2>
        <button 
          onClick={testOriginValidity}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Test Origin Validity
        </button>
        
        {testResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p className="font-medium">Test Result:</p>
            <p>{testResult}</p>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Verify that <code className="bg-gray-100 px-1 rounded">{origin}</code> is added as an Authorized JavaScript Origin in the Google Cloud Console</li>
          <li>Verify that <code className="bg-gray-100 px-1 rounded">{`${origin}/auth/login`}</code> is added as an Authorized Redirect URI</li>
          <li>Check that you're using the correct Client ID</li>
          <li>Check that your Google Cloud Project has the necessary APIs enabled</li>
          <li>Ensure that the OAuth consent screen is properly configured</li>
        </ol>
      </div>
    </div>
  );
} 