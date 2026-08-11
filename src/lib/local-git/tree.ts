/**
 * Read file tree for a local project.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { gitSafe } from './exec';
import { parsePorcelain, displayStatus } from './porcelain';
import type { TreeEntry, ProjectTree } from './types';

async function lastCommitFor(rootPath: string, relPath: string): Promise<TreeEntry['lastCommit']> {
  const out = await gitSafe(rootPath, ['log', '-1', '--format=%h%x00%at%x00%s', '--', relPath]);
  if (!out) return null;
  const [sha, timestamp, ...messageParts] = out.split('\0');
  return { sha, message: messageParts.join('\0'), timestamp: new Date(Number(timestamp) * 1000).toISOString() };
}

export async function getProjectTree(rootPath: string, dirPath = ''): Promise<ProjectTree> {
  const resolved = path.resolve(rootPath);
  const dir = dirPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const porcelain = await gitSafe(resolved, ['status', '--porcelain=v1']);
  const statusMap = new Map<
    string,
    { indexStatus: string; workTreeStatus: string; untracked: boolean; conflict: boolean; staged: boolean }
  >();
  for (const line of porcelain.split('\n')) {
    if (!line.trim()) continue;
    const parsed = parsePorcelain(line);
    if (parsed) statusMap.set(parsed.path, parsed);
  }

  const dirAbsolute = dir ? path.join(resolved, ...dir.split('/')) : resolved;
  const dirents = await readdir(dirAbsolute, { withFileTypes: true });

  const entries = await Promise.all(
    dirents
      .filter((entry) => entry.name !== '.git')
      .map(async (entry) => {
        const relPath = dir ? `${dir}/${entry.name}` : entry.name;
        const type: 'tree' | 'blob' = entry.isDirectory() ? 'tree' : 'blob';
        let status = 'clean';
        if (type === 'blob') {
          const parsed = statusMap.get(relPath);
          status = parsed ? displayStatus(parsed) : 'clean';
        } else {
          const childChanges = [...statusMap.entries()].filter(([childPath]) => childPath.startsWith(`${relPath}/`));
          if (childChanges.some(([, parsed]) => parsed.conflict)) status = 'U';
          else if (childChanges.some(([, parsed]) => !parsed.untracked)) status = 'M';
          else if (childChanges.some(([, parsed]) => parsed.untracked)) status = '??';
        }
        const lastCommit = await lastCommitFor(resolved, relPath);
        return { name: entry.name, path: relPath, type, status, lastCommit };
      }),
  );

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { rootPath: resolved, dirPath: dir, entries };
}
