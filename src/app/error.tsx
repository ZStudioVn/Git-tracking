/**
 * Error boundary for Next.js App Router
 */
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">
          An error occurred while loading this page. Please try again.
        </p>
        
        {error.message && (
          <div className="mb-6 p-3 bg-gray-100 rounded text-sm text-left">
            <p className="font-mono text-gray-700">{error.message}</p>
          </div>
        )}
        
        <button
          onClick={reset}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-medium"
        >
          Try again
        </button>
        
        <a
          href="/dashboard"
          className="block mt-3 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
