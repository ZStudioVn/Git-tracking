/**
 * Shared types for local Git operations.
 * Extracted from the duplicate type definitions in src/lib/local-git.ts and electron/services/local-git.ts
 */

export interface LocalGitStatus {
  rootPath: string;
  isGitRepo: boolean;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  changes: string[];
}

export interface DiffFile {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  staged: boolean;
  untracked: boolean;
  conflict: boolean;
  diff: string | null;
}

export interface ProjectDiff {
  rootPath: string;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  files: DiffFile[];
}

export interface LogEntry {
  sha: string;
  message: string;
  authorName: string;
  authoredAt: string;
  parents: string[];
}

export interface TreeEntry {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  status: string;
  lastCommit: { sha: string; message: string; timestamp: string } | null;
}

export interface ProjectTree {
  rootPath: string;
  dirPath: string;
  entries: TreeEntry[];
}

export interface CommitResult {
  sha: string;
}

export interface LocalGitConfig {
  authorName: string | null;
  authorEmail: string | null;
}
