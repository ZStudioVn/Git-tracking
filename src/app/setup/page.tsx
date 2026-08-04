/**
 * Setup page — repository connection flow.
 * URL: /setup
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LocalProjects } from '@/components/local-projects';

export default function SetupPage() {
  const router = useRouter();
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/repos/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect repository');
      }

      // Redirect to dashboard after successful connection
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">Connect Repository</h1>
        <p className="text-gray-600 mb-6">
          Enter the GitHub repository you want to track. Make sure you have access to it.
        </p>

        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label htmlFor="owner" className="block text-sm font-medium mb-1">
              Owner / Organization
            </label>
            <input
              id="owner"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g., facebook"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Repository Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., react"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Connecting...' : 'Connect Repository'}
          </button>
        </form>
        <LocalProjects />

        <div className="mt-6 text-sm text-gray-500">
          <p className="font-medium mb-1">Note:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>MVP supports single repository only</li>
            <li>Initial sync will start automatically</li>
            <li>You must have read access to the repository</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
