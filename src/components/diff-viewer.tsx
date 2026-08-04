'use client';

/**
 * DiffViewer — integrates react-diff-view for unified/split diff display.
 * Supports unified / split toggle (3B-02).
 * All diff content goes through React's built-in escaping — no dangerouslySetInnerHTML (SETUP.md §10).
 */

import { useState } from 'react';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import 'react-diff-view/style/index.css';

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

interface Props {
  diffs: FileDiff[];
  selectedPath?: string;
}

export function DiffViewer({ diffs, selectedPath }: Props) {
  const [splitView, setSplitView] = useState(false);

  const selected = selectedPath
    ? diffs.find((d) => d.path === selectedPath)
    : diffs[0];

  if (!selected) {
    return <p className="text-gray-500 text-sm">No file selected.</p>;
  }

  if (selected.binary) {
    return <p className="text-gray-500 text-sm">Binary file — diff not available.</p>;
  }

  if (selected.oversized) {
    return <p className="text-gray-500 text-sm">File too large to display inline.</p>;
  }

  if (!selected.patch) {
    return <p className="text-gray-500 text-sm">No changes to display.</p>;
  }

  // Parse the diff patch
  const files = parseDiff(selected.patch);
  const file = files[0];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ADDED: 'bg-green-100 text-green-800',
      MODIFIED: 'bg-blue-100 text-blue-800',
      DELETED: 'bg-red-100 text-red-800',
      RENAMED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(selected.status)}`}>
            {selected.status}
          </span>
          <span className="font-mono text-sm font-medium">{selected.path}</span>
          {selected.status === 'RENAMED' && selected.oldPath && (
            <span className="text-xs text-gray-500">← {selected.oldPath}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-green-600 font-medium">+{selected.additions}</span>
          <span className="text-sm text-red-600 font-medium">-{selected.deletions}</span>
          <button
            onClick={() => setSplitView((v) => !v)}
            className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-50"
          >
            {splitView ? 'Unified' : 'Split'} view
          </button>
        </div>
      </div>

      {file && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Diff
            viewType={splitView ? 'split' : 'unified'}
            diffType={file.type}
            hunks={file.hunks || []}
          >
            {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
          </Diff>
        </div>
      )}
    </div>
  );
}
