/**
 * Dashboard home — repository overview. (2C-01)
 * Shows: repo info, branches, last sync status, commit graph entry point.
 * URL: /dashboard  (D-08: permalink)
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RepoSelector } from '@/components/repo-selector';
import { SyncStatus } from '@/components/sync-status-widget';
import { CommitGraph } from '@/components/commit-graph';
import { FileTree } from '@/components/file-tree';

interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
}

interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authoredAt: string;
  parents: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [branches, setBranches] = useState<{ name: string; headSha: string }[]>([]);
  const [tree, setTree] = useState<{ path: string; type: 'tree' | 'blob'; sha: string; name?: string }[]>([]);
  const [treeSha, setTreeSha] = useState('');

  useEffect(() => {
    fetchRepository();
  }, []);

  useEffect(() => {
    if (repo) {
      fetchCommits();
      fetchBranches();
      fetchTree(selectedBranch);
    }
  }, [repo, selectedBranch]);

  const fetchRepository = async () => {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();

      if (data.repo) {
        setRepo(data.repo);
        setSelectedBranch(data.repo.defaultBranch || 'main');
      } else {
        // No repository connected, redirect to setup
        router.push('/setup');
      }
    } catch (err) {
      console.error('Failed to fetch repository:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommits = async () => {
    try {
      const res = await fetch(`/api/commits?branch=${selectedBranch}&limit=50`);
      const data = await res.json();
      setCommits(data.commits || []);
    } catch (err) {
      console.error('Failed to fetch commits:', err);
    }
  };

  const fetchBranches = async () => {
    const res = await fetch('/api/branches');
    if (res.ok) {
      const data = await res.json();
      setBranches(data.branches ?? []);
    }
  };

  const fetchTree = async (revision: string) => {
    const res = await fetch(`/api/tree?revision=${encodeURIComponent(revision)}`);
    if (res.ok) {
      const data = await res.json();
      setTree(data.nodes ?? []);
      setTreeSha(data.treeSha ?? '');
    }
  };

  const handleSelectCommit = (sha: string) => {
    router.push(`/dashboard/commit/${sha}`);
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </main>
    );
  }

  if (!repo) {
    return null; // Will redirect to /setup
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Repository Dashboard</h1>
        <RepoSelector currentRepo={{ owner: repo.owner, name: repo.name }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sync Status Sidebar */}
        <div className="lg:col-span-1">
          <SyncStatus repositoryId={repo.id} />
        </div>

        {/* Commit Graph */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Commit History</h2>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={repo.defaultBranch}>{repo.defaultBranch}</option>
                {branches.filter((branch) => branch.name !== repo.defaultBranch).map((branch) => (
                  <option key={branch.name} value={branch.name}>{branch.name}</option>
                ))}
              </select>
            </div>

            {commits.length === 0 ? (
              <p className="text-gray-500">No commits yet. Sync your repository to see commits.</p>
            ) : (
              <CommitGraph
                commits={commits}
                onSelectCommit={handleSelectCommit}
              />
            )}
          </div>
        </div>
      </div>
      <section className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Files at {selectedBranch}</h2>
          {treeSha && <code className="text-xs text-gray-500">tree {treeSha.slice(0, 8)}</code>}
        </div>
        <FileTree
          nodes={tree}
          revision={selectedBranch}
          onExpandFolder={(path) => router.push(`/dashboard/tree?revision=${encodeURIComponent(selectedBranch)}&path=${encodeURIComponent(path)}`)}
          onSelectFile={(path) => router.push(`/dashboard/tree?revision=${encodeURIComponent(selectedBranch)}&path=${encodeURIComponent(path)}`)}
        />
      </section>
    </main>
  );
}
