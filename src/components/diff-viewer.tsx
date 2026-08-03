'use client';

/**
 * DiffViewer — wraps react-diff-viewer-continued. (3B-01)
 * Supports unified / split toggle (3B-02).
 * All diff content goes through React's built-in escaping — no dangerouslySetInnerHTML (SETUP.md §10).
 */

import { useState } from 'react';

interface FileDiff {
  path: string;
  oldPath?: string;
  status: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'UNCHANGED';
  additions: number;
  deletions: number;
  binary: boolean;
  tooLarge: boolean;
  oldContent?: string;
  newContent?: string;
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
    return <p className="text-muted-foreground text-sm">No file selected.</p>;
  }

  if (selected.binary) {
    return <p className="text-muted-foreground text-sm">Binary file — diff not available.</p>;
  }

  if (selected.tooLarge) {
    return <p className="text-muted-foreground text-sm">File too large to display inline.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono font-medium">{selected.path}</span>
        <span className="text-green-600">+{selected.additions}</span>
        <span className="text-red-500">-{selected.deletions}</span>
        <button
          onClick={() => setSplitView((v) => !v)}
          className="ml-auto text-xs underline"
        >
          {splitView ? 'Unified' : 'Split'} view
        </button>
      </div>
      {/* TODO Phase 3: mount react-diff-viewer-continued here */}
      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[600px]">
        Phase 3 — diff renderer coming next.
      </pre>
    </div>
  );
}
