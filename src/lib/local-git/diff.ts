/**
 * Compute diffs for local project files.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inspectLocalGit } from './inspect';
import { parsePorcelain } from './porcelain';
import { gitSafe } from './exec';
import type { DiffFile, ProjectDiff } from './types';

export async function getProjectDiff(rootPath: string): Promise<ProjectDiff> {
  const resolved = path.resolve(rootPath);
  const status = await inspectLocalGit(resolved);
  if (!status.isGitRepo)
    return { rootPath: resolved, branch: null, headSha: null, remoteUrl: null, ahead: null, behind: null, files: [] };
  const files: DiffFile[] = [];
  for (const line of status.changes) {
    if (!line.trim()) continue;
    const parsed = parsePorcelain(line);
    if (!parsed) continue;
    let diff: string | null = null;
    if (parsed.conflict) {
      diff = (await gitSafe(resolved, ['diff', '--', parsed.path])) || null;
    } else if (parsed.untracked) {
      const content = await readFile(path.join(resolved, parsed.path), 'utf8').catch(() => '');
      diff = content ? content.split('\n').map((contentLine) => `+${contentLine}`).join('\n') : null;
    } else {
      const parts: string[] = [];
      if (parsed.staged) parts.push(await gitSafe(resolved, ['diff', '--cached', '--', parsed.path]));
      if (!parsed.staged || parsed.workTreeStatus !== ' ') parts.push(await gitSafe(resolved, ['diff', '--', parsed.path]));
      diff = parts.filter(Boolean).join('\n') || null;
    }
    files.push({ ...parsed, diff });
  }
  return {
    rootPath: resolved,
    branch: status.branch,
    headSha: status.headSha,
    remoteUrl: status.remoteUrl,
    ahead: status.ahead,
    behind: status.behind,
    files,
  };
}
