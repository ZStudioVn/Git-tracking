/**
 * Local Git operations module.
 *
 * All functions for inspecting, diffing, staging, committing, and pushing
 * local Git repositories. Shared between the Next.js API routes and
 * the Electron desktop shell.
 *
 * Usage:
 *   import { inspectLocalGit, getProjectDiff, ... } from '@/lib/local-git';
 *
 * Re-exports everything from sub-modules for backward compatibility.
 */

export type {
  LocalGitStatus,
  DiffFile,
  ProjectDiff,
  LogEntry,
  TreeEntry,
  ProjectTree,
  CommitResult,
  LocalGitConfig,
} from './types';

export { inspectLocalGit } from './inspect';
export { getProjectDiff } from './diff';
export { getProjectLog } from './log';
export { getProjectTree } from './tree';
export { stageFiles, unstageFiles, commitChanges, pushProject } from './staging';
export { readLocalGitConfig, writeLocalGitConfig } from './config';
export { git, gitSafe, assertSafeRelativePaths } from './exec';
export { parsePorcelain, displayStatus } from './porcelain';
