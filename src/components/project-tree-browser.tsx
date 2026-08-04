'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TreeEntry } from '@/types/desktop';

interface Props {
  projectId: string;
  onSelectFile: (path: string, status: string, lastCommit: TreeEntry['lastCommit']) => void;
}

const STATUS_DOT: Record<string, string> = {
  U: 'bg-red-500',
  '??': 'bg-gray-400',
  M: 'bg-amber-500',
  A: 'bg-green-500',
  D: 'bg-rose-400',
  R: 'bg-purple-400',
};

function formatTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ProjectTreeBrowser({ projectId, onSelectFile }: Props) {
  const [roots, setRoots] = useState<TreeEntry[]>([]);
  const [children, setChildren] = useState<Record<string, TreeEntry[]>>({});
  const [loadingRoot, setLoadingRoot] = useState(true);
  const [error, setError] = useState('');

  const loadDir = useCallback(async (dirPath: string): Promise<TreeEntry[]> => {
    if (window.gitTracking?.projects?.tree) {
      const tree = await window.gitTracking.projects.tree(projectId, dirPath);
      return tree.entries;
    }
    const res = await fetch(`/api/local-projects/${projectId}/tree?path=${encodeURIComponent(dirPath)}`);
    if (!res.ok) throw new Error('Could not load directory');
    const data = await res.json();
    return data.tree.entries as TreeEntry[];
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRoot(true);
    setError('');
    void loadDir('')
      .then((entries) => { if (!cancelled) setRoots(entries); })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load project tree');
      })
      .finally(() => { if (!cancelled) setLoadingRoot(false); });
    return () => { cancelled = true; };
  }, [loadDir]);

  const toggleDir = async (dir: TreeEntry) => {
    if (children[dir.path]) {
      setChildren((current) => { const next = { ...current }; delete next[dir.path]; return next; });
      return;
    }
    setChildren((current) => ({ ...current, [dir.path]: [] }));
    try {
      const entries = await loadDir(dir.path);
      setChildren((current) => ({ ...current, [dir.path]: entries }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load directory');
      setChildren((current) => { const next = { ...current }; delete next[dir.path]; return next; });
    }
  };

  const renderRow = (entry: TreeEntry, depth: number) => {
    const isDir = entry.type === 'tree';
    const expanded = isDir && children[entry.path] !== undefined;
    const dot = entry.status !== 'clean' ? STATUS_DOT[entry.status] ?? 'bg-gray-400' : null;
    return (
      <li key={entry.path}>
        <div className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-50" style={{ paddingLeft: depth * 20 + 4 }}>
          {isDir ? (
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => void toggleDir(entry)}>
              <span className="w-4 text-center text-xs text-gray-400">{expanded ? '▼' : '▶'}</span>
              <span className="truncate">📁 {entry.name}</span>
              {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
              {entry.lastCommit && <span className="ml-auto shrink-0 text-xs text-gray-400">{formatTime(entry.lastCommit.timestamp)}</span>}
            </button>
          ) : (
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => onSelectFile(entry.path, entry.status, entry.lastCommit)}>
              <span className="w-4" />
              <span className="truncate">📄 {entry.name}</span>
              {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
              {entry.status !== 'clean' && <span className="shrink-0 rounded bg-gray-100 px-1 font-mono text-[10px] text-gray-600">{entry.status}</span>}
              {entry.lastCommit && <span className="ml-auto shrink-0 text-xs text-gray-400">{formatTime(entry.lastCommit.timestamp)}</span>}
            </button>
          )}
        </div>
        {isDir && expanded && (
          <ul>{children[entry.path].map((child) => renderRow(child, depth + 1))}</ul>
        )}
      </li>
    );
  };

  if (loadingRoot) return <p className="text-sm text-gray-500">Loading files…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return <ul className="space-y-0.5">{roots.map((entry) => renderRow(entry, 0))}</ul>;
}
