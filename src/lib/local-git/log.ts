/**
 * Fetch commit log for a local project.
 */
import path from 'node:path';
import { git } from './exec';
import type { LogEntry } from './types';

export async function getProjectLog(rootPath: string, limit = 100): Promise<LogEntry[]> {
  const resolved = path.resolve(rootPath);
  const out = await git(resolved, ['log', '--all', `--max-count=${limit}`, '--format=%H%x00%P%x00%an%x00%at%x00%s']);
  if (!out) return [];
  return out.split('\n').filter(Boolean).map((line) => {
    const [sha, parents, authorName, timestamp, ...messageParts] = line.split('\0');
    return {
      sha,
      message: messageParts.join('\0'),
      authorName,
      authoredAt: new Date(Number(timestamp) * 1000).toISOString(),
      parents: parents ? parents.split(' ') : [],
    };
  });
}
