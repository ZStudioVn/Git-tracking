'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import { CommitGraph, type GraphCommit } from '@/components/commit-graph';
import { ProjectTreeBrowser } from '@/components/project-tree-browser';
import type { DiffFile, LogEntry, ProjectDiff, TreeEntry } from '@/types/desktop';

type Tab = 'changes' | 'files' | 'history';

function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.gitTracking?.projects?.diff;
}

function badgeFor(file: DiffFile): { text: string; className: string } {
  if (file.conflict) return { text: '!!', className: 'bg-red-100 text-red-700' };
  if (file.untracked) return { text: '??', className: 'bg-gray-100 text-gray-600' };
  if (file.staged && file.workTreeStatus !== ' ') return { text: 'MM', className: 'bg-amber-100 text-amber-700' };
  if (file.staged) return { text: file.indexStatus, className: 'bg-green-100 text-green-700' };
  return { text: file.workTreeStatus, className: 'bg-yellow-100 text-yellow-700' };
}

function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split('\n');
  return (
    <pre className="max-h-[60vh] overflow-auto rounded bg-gray-950 p-4 text-xs leading-relaxed">
      {lines.map((line, index) => {
        let className = 'text-gray-400';
        if (line.startsWith('+++') || line.startsWith('---')) className = 'font-semibold text-gray-200';
        else if (line.startsWith('@@')) className = 'text-blue-400';
        else if (line.startsWith('+')) className = 'text-green-400';
        else if (line.startsWith('-')) className = 'text-red-400';
        return (
          <div key={index} className={className}>
            {line === '' ? ' ' : line}
          </div>
        );
      })}
    </pre>
  );
}

const TABS: { value: Tab; label: string }[] = [
  { value: 'changes', label: 'Changes' },
  { value: 'files', label: 'Files' },
  { value: 'history', label: 'History' },
];

export default function LocalProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [diff, setDiff] = useState<ProjectDiff | null>(null);
  const [commits, setCommits] = useState<GraphCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState('');
  const [tab, setTab] = useState<Tab>('changes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [treeFile, setTreeFile] = useState<{ path: string; status: string; lastCommit: TreeEntry['lastCommit'] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = isDesktop()
        ? await window.gitTracking?.projects.diff(params.id)
        : await fetch(`/api/local-projects/${params.id}/diff`).then(async (res) => {
            if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || 'Could not load diff');
            return ((await res.json()) as { diff: ProjectDiff }).diff;
          });
      setDiff(data as ProjectDiff);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load project');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadHistory = useCallback(async () => {
    try {
      const data = isDesktop()
        ? await window.gitTracking?.projects.log(params.id)
        : await fetch(`/api/local-projects/${params.id}/log`).then(async (res) => {
            if (!res.ok) throw new Error('Could not load history');
            return ((await res.json()) as { commits: LogEntry[] }).commits;
          });
      setCommits((data as LogEntry[]).map((entry) => ({
        sha: entry.sha,
        message: entry.message,
        authorName: entry.authorName,
        authoredAt: entry.authoredAt,
        parents: entry.parents,
      })));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not load history');
    }
  }, [params.id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === 'history' && commits.length === 0) void loadHistory();
  }, [tab, commits.length, loadHistory]);

  const groups = useMemo(() => {
    if (!diff) return null;
    const files = diff.files;
    return {
      conflicts: files.filter((file) => file.conflict),
      staged: files.filter((file) => file.staged && !file.conflict),
      unstaged: files.filter((file) => !file.untracked && !file.staged && !file.conflict),
      untracked: files.filter((file) => file.untracked),
    };
  }, [diff]);

  const selectedFile = diff?.files.find((file) => file.path === selected) ?? null;

  const copyDiff = async () => {
    if (!selectedFile?.diff) return;
    await navigator.clipboard.writeText(selectedFile.diff);
    toast.success('Diff copied to clipboard');
  };

  const openFolder = async () => {
    if (!diff || !window.gitTracking) return;
    await window.gitTracking.projects.openFolder(diff.rootPath);
  };

  if (loading) return <main className="mx-auto max-w-7xl p-6"><p className="text-sm text-gray-500">Loading project diff…</p></main>;

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Back to dashboard</Link>
      </main>
    );
  }

  if (!diff || !groups) return null;

  const groupRows: { label: string; items: DiffFile[] }[] = [
    { label: 'Conflicts', items: groups.conflicts },
    { label: 'Staged', items: groups.staged },
    { label: 'Modified', items: groups.unstaged },
    { label: 'Untracked', items: groups.untracked },
  ].filter((group) => group.items.length > 0);

  const projectName = diff.rootPath.split(/[\\/]/).pop() ?? 'Project';

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold">{projectName}</h1>
          <p className="break-all font-mono text-xs text-gray-500">{diff.rootPath}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{diff.branch ?? 'detached HEAD'}</span>
          {diff.headSha && <span className="font-mono">· {diff.headSha.slice(0, 8)}</span>}
          {diff.remoteUrl && <span className="max-w-64 truncate font-mono text-xs">· {diff.remoteUrl}</span>}
          <span className="flex items-center gap-1 text-xs">
            <span className="text-blue-600">↑ {diff.ahead ?? 0}</span>
            <span className="text-amber-600">↓ {diff.behind ?? 0}</span>
          </span>
          <button className="rounded border px-3 py-1.5 text-sm" onClick={() => void load()}>Refresh</button>
          {isDesktop() && <button className="rounded border px-3 py-1.5 text-sm" onClick={() => void openFolder()}>Open folder</button>}
        </div>
      </div>

      <div className="mb-4 inline-flex overflow-hidden rounded border">
        {TABS.map((item) => (
          <button
            key={item.value}
            className={`px-4 py-1.5 text-sm ${tab === item.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'changes' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            {groupRows.length === 0 ? (
              <p className="text-sm text-gray-500">Working tree is clean.</p>
            ) : (
              <ul className="space-y-3">
                {groupRows.map((group) => (
                  <li key={group.label}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {group.label} ({group.items.length})
                    </p>
                    <ul className="space-y-1">
                      {group.items.map((file) => {
                        const badge = badgeFor(file);
                        return (
                          <li key={file.path}>
                            <button
                              className={`w-full rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-gray-50 ${selected === file.path ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}
                              onClick={() => setSelected(file.path)}
                            >
                              <span className={`mr-2 inline-block w-8 rounded px-1 text-center font-bold ${badge.className}`}>{badge.text}</span>
                              <span className="break-all">{file.path}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0 rounded-lg border bg-white p-4 shadow-sm">
            {selectedFile ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="min-w-0 truncate font-mono text-sm font-semibold">{selectedFile.path}</h2>
                  {selectedFile.diff && (
                    <button className="shrink-0 rounded border px-2 py-1 text-xs" onClick={() => void copyDiff()}>Copy diff</button>
                  )}
                </div>
                {selectedFile.diff ? (
                  <DiffViewer diff={selectedFile.diff} />
                ) : (
                  <p className="text-sm text-gray-500">No diff available (binary file or empty change).</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Select a file to view its diff.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'files' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <ProjectTreeBrowser
              projectId={params.id}
              onSelectFile={(path, status, lastCommit) => setTreeFile({ path, status, lastCommit })}
            />
          </div>
          <div className="min-w-0 rounded-lg border bg-white p-4 shadow-sm">
            {treeFile ? (
              <div className="space-y-3">
                <h2 className="min-w-0 break-all font-mono text-sm font-semibold">{treeFile.path}</h2>
                {(() => {
                  const changed = diff.files.find((file) => file.path === treeFile.path);
                  if (changed?.diff) return <DiffViewer diff={changed.diff} />;
                  return (
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{treeFile.status === 'clean' ? 'No uncommitted changes.' : `Status: ${treeFile.status}`}</p>
                      {treeFile.lastCommit && (
                        <div className="mt-2 rounded border p-2 text-xs">
                          <p className="font-mono font-semibold">{treeFile.lastCommit.sha}</p>
                          <p className="mt-1">{treeFile.lastCommit.message}</p>
                          <p className="mt-1 text-gray-400">{new Date(treeFile.lastCommit.timestamp).toLocaleString()}</p>
                        </div>
                      )}
                      {!treeFile.lastCommit && <p className="text-xs text-gray-400">Never committed.</p>}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a file to see its diff and last commit.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          {commits.length === 0 ? (
            <p className="text-sm text-gray-500">Loading history…</p>
          ) : (
            <CommitGraph
              commits={commits}
              selectedSha={selectedCommit}
              onSelectCommit={(sha) => setSelectedCommit(sha)}
            />
          )}
        </div>
      )}
    </main>
  );
}
