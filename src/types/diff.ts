/**
 * Shared diff / comparison TypeScript types.
 * Line-level diffs are NOT stored — computed on demand. (D-04)
 */

export type FileChangeStatus = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'UNCHANGED';

export interface FileChange {
  path: string;
  oldPath: string | null;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  binary: boolean;
  oversized: boolean;
}

export interface ComparisonResult {
  base: string;
  head: string;
  mergeBase: string;
  files: FileChange[];
}

export interface LineDiff {
  path: string;
  patch: string | null;
  oversized: boolean;
  binary: boolean;
}
