/**
 * Git status inspection — check if a path is a git repo, current branch, HEAD SHA, etc.
 */
import { access as fsAccess } from 'node:fs/promises';
import path from 'node:path';
import { git } from './exec';
import type { LocalGitStatus } from './types';

export async function inspectLocalGit(rootPath: string): Promise<LocalGitStatus> {
  const resolved = path.resolve(rootPath);
  await fsAccess(resolved);
  try {
    const [branch, headSha, remoteUrl, porcelain, upstreamCount] = await Promise.all([
      git(resolved, ['branch', '--show-current']),
      git(resolved, ['rev-parse', 'HEAD']),
      git(resolved, ['remote', 'get-url', 'origin']).catch(() => ''),
      git(resolved, ['status', '--porcelain=v1']),
      git(resolved, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).catch(() => ''),
    ]);
    let ahead: number | null = null;
    let behind: number | null = null;
    if (upstreamCount) {
      const [left, right] = upstreamCount.split(/\s+/);
      behind = Number.parseInt(left, 10) || 0;
      ahead = Number.parseInt(right, 10) || 0;
    }
    return {
      rootPath: resolved,
      isGitRepo: true,
      branch: branch || null,
      headSha: headSha || null,
      remoteUrl: remoteUrl || null,
      ahead,
      behind,
      changes: porcelain ? porcelain.split('\n') : [],
    };
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code: unknown }).code : undefined;
    if (code === 128) {
      return {
        rootPath: resolved,
        isGitRepo: false,
        branch: null,
        headSha: null,
        remoteUrl: null,
        ahead: null,
        behind: null,
        changes: [],
      };
    }
    throw error;
  }
}
