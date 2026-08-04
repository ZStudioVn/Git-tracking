/**
 * Diff workspace page. (3B-06)
 * URL: /dashboard/diff?base=<sha>&head=<sha>  (D-08: permalink)
 * Optional: &path=<filepath> to jump to a specific file diff.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DiffViewer } from '@/components/diff-viewer';

interface FileDiff {
  path: string;
  oldPath?: string;
  status: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'UNCHANGED';
  additions: number;
  deletions: number;
  binary: boolean;
  oversized: boolean;
  patch?: string;
}

interface Comparison {
  base: string;
  head: string;
  mergeBase: string;
  files: FileDiff[];
}

export default function DiffPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const base = searchParams.get('base');
  const head = searchParams.get('head');
  const path = searchParams.get('path');

  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!base || !head) return;

    const controller = new AbortController();
    void fetchComparison(base, head, path, controller.signal);
    return () => controller.abort();
  }, [base, head, path]);

  const fetchComparison = async (
    baseRevision: string,
    headRevision: string,
    selectedPath: string | null,
    signal: AbortSignal,
  ) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/diff?base=${encodeURIComponent(baseRevision)}&head=${encodeURIComponent(headRevision)}`,
        { signal },
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch comparison');
      }

      const result = data.comparison as Comparison;
      if (selectedPath) {
        const patchResponse = await fetch(
          `/api/diff?base=${encodeURIComponent(baseRevision)}&head=${encodeURIComponent(headRevision)}&path=${encodeURIComponent(selectedPath)}`,
          { signal },
        );
        if (!patchResponse.ok) {
          throw new Error('Failed to fetch file diff');
        }
        const patchData = await patchResponse.json();
        const selected = result.files.find((file) => file.path === selectedPath);
        if (selected && patchData.lineDiff) Object.assign(selected, patchData.lineDiff);
      }
      setComparison(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
    } finally {
      setLoading(false);
    }
  };

  if (!base || !head) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">Diff Workspace</h1>
          <p className="text-gray-600 mb-2">
            Select two commits or branches to compare.
          </p>
          <p className="text-sm text-gray-500">
            URL format: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/diff?base=&lt;sha&gt;&amp;head=&lt;sha&gt;</code>
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!comparison) {
    return null;
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Comparing Revisions</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <code className="px-2 py-1 bg-gray-100 rounded font-mono">{base.slice(0, 8)}</code>
          <span>→</span>
          <code className="px-2 py-1 bg-gray-100 rounded font-mono">{head.slice(0, 8)}</code>
          {comparison.mergeBase !== base && (
            <span className="text-xs text-gray-500">
              (merge base: {comparison.mergeBase.slice(0, 8)})
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File list sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-3">Changed Files ({comparison.files.length})</h2>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {comparison.files.map((file) => (
                <button
                   key={file.path}
                  onClick={() => router.push(`/dashboard/diff?base=${base}&head=${head}&path=${file.path}`)}
                  className={`w-full text-left p-2 rounded text-sm hover:bg-gray-50 ${
                    path === file.path ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="font-mono truncate">{file.path}</div>
                  <div className="flex gap-2 text-xs mt-1">
                    <span className="text-green-600">+{file.additions}</span>
                    <span className="text-red-600">-{file.deletions}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diff viewer */}
        <div className="lg:col-span-3">
          <DiffViewer diffs={comparison.files} selectedPath={path || undefined} />
        </div>
      </div>
    </main>
  );
}
