/**
 * Git staging/unstaging, committing, and pushing operations.
 */
import path from 'node:path';
import { git, assertSafeRelativePaths } from './exec';
import type { CommitResult } from './types';

export async function stageFiles(rootPath: string, paths: string[]): Promise<void> {
  const resolved = path.resolve(rootPath);
  if (paths.length === 0) {
    await git(resolved, ['add', '-A']);
    return;
  }
  assertSafeRelativePaths(paths);
  await git(resolved, ['add', '--', ...paths]);
}

export async function unstageFiles(rootPath: string, paths: string[]): Promise<void> {
  const resolved = path.resolve(rootPath);
  if (paths.length === 0) {
    await git(resolved, ['reset']);
    return;
  }
  assertSafeRelativePaths(paths);
  await git(resolved, ['reset', '--', ...paths]);
}

export async function commitChanges(
  rootPath: string,
  message: string,
  author?: { name: string; email: string },
): Promise<CommitResult> {
  const resolved = path.resolve(rootPath);
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 1000) throw new Error('Invalid commit message');
  const configArgs =
    author?.name && author?.email ? ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`] : [];
  await git(resolved, [...configArgs, 'commit', '-m', trimmed], 60_000);
  const sha = await git(resolved, ['rev-parse', 'HEAD']);
  return { sha };
}

export async function pushProject(rootPath: string): Promise<void> {
  const resolved = path.resolve(rootPath);
  const branch = await git(resolved, ['branch', '--show-current']);
  if (!branch) throw new Error('Not on a branch — cannot push');
  await git(resolved, ['push', '-u', 'origin', branch], 120_000);
}
