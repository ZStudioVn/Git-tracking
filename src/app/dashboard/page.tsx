/**
 * Dashboard home — repository overview. (2C-01)
 * Shows: repo info, branches, last sync status, commit graph entry point.
 * URL: /dashboard  (D-08: permalink)
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RepoSelector } from '@/components/repo-selector';
import { SyncStatus } from '@/components/sync-status-widget';
import { CommitGraph } from '@/components/commit-graph';
import { FileTree } from '@/components/file-tree';
import { GitCommandCenter } from '@/components/git-command-center';
import { LocalProjects } from '@/components/local-projects';

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

type ViewMode = 'all' | 'github' | 'local';

const VIEW_TABS: { value: ViewMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'github', label: 'GitHub' },
  { value: 'local', label: 'Local' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [branches, setBranches] = useState<{ name: string; headSha: string }[]>([]);
  const [tree, setTree] = useState<{ path: string; type: 'tree' | 'blob'; sha: string; name?: string }[]>([]);
  const [treeSha, setTreeSha] = useState('');
  const [view, setView] = useState<ViewMode>('all');

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch('/api/repos', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch repository');
        const data = await res.json();
        if (data.repo) {
          setRepo(data.repo);
          setSelectedBranch(data.repo.defaultBranch || 'main');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to fetch repository:', err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!repo) return;

    const controller = new AbortController();
    void Promise.all([
      fetchCommits(selectedBranch, controller.signal),
      fetchBranches(controller.signal),
      fetchTree(selectedBranch, controller.signal),
    ]);
    return () => controller.abort();
  }, [repo, selectedBranch]);

  const fetchCommits = async (branch: string, signal: AbortSignal) => {
    try {
      const res = await fetch(`/api/commits?branch=${encodeURIComponent(branch)}&limit=50`, { signal });
      if (!res.ok) throw new Error('Failed to fetch commits');
      const data = await res.json();
      setCommits(data.commits || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch commits:', err);
    }
  };

  const fetchBranches = async (signal: AbortSignal) => {
    const res = await fetch('/api/branches', { signal });
    if (!res.ok) throw new Error('Failed to fetch branches');
    const data = await res.json();
    setBranches(data.branches || []);
  };

  const fetchTree = async (branch: string, signal: AbortSignal) => {
    try {
      const res = await fetch(`/api/tree?revision=${encodeURIComponent(branch)}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch tree');
      const data = await res.json();
      setTree(data.items || []);
      setTreeSha(data.treeSha || '');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch tree:', err);
    }
  };

  const handleSelectCommit = (sha: string) => {
    router.push(`/dashboard/commit/${sha}`);
  };

  if (loading) {
    return <main className="mx-auto max-w-7xl p-6"><p className="text-sm text-gray-500">Loading dashboard…</p></main>;
  }

  const showGithub = view === 'all' || view === 'github';
  const showLocal = view === 'all' || view === 'local';

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold">Repository Dashboard</h1>
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex overflow-hidden rounded border">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`px-4 py-1.5 text-sm ${view === tab.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setView(tab.value)}
              >
                {tab.label}
              </button>
            ))}
            <Link href="/dashboard/logs" className="rounded border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">System logs</Link>
          </div>
          {repo && <RepoSelector currentRepo={{ owner: repo.owner, name: repo.name }} />}
        </div>
      </div>

      {showGithub && !repo && (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold">No GitHub repository connected</h2>
          <p className="mt-1 text-sm text-gray-500">Connect a GitHub repo to see sync status, commit history, and the command center.</p>
          <Link href="/setup" className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Connect a GitHub repo</Link>
        </div>
      )}

      {showGithub && repo && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <SyncStatus />
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Commit History</h2>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <section className="mt-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
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
          <GitCommandCenter repositoryId={repo.id} repositoryName={repo.fullName} defaultBranch={repo.defaultBranch} headSha={branches.find((branch) => branch.name === repo.defaultBranch)?.headSha} />
        </>
      )}

      {showLocal && <LocalProjects />}
    </main>
  );
}
