/**
 * Local diff calculation via isomorphic-git. (D-02)
 * Used for comparing working tree against last commit (local-vs-remote state badge).
 */
import git from 'isomorphic-git';
import fs from 'fs';
import { logger } from '@/lib/logger';

export interface LocalDiffEntry {
  path: string;
  type: 'added' | 'deleted' | 'modified' | 'unmodified';
}

export async function diffCommits(
  dir: string,
  fromRef: string,
  toRef: string,
): Promise<LocalDiffEntry[]> {
  try {
    const result: LocalDiffEntry[] = [];
    await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: fromRef }), git.TREE({ ref: toRef })],
      map: async (filepath, [a, b]) => {
        if (filepath === '.') return null;
        const [aOid, bOid] = await Promise.all([a?.oid(), b?.oid()]);
        if (aOid === bOid) {
          result.push({ path: filepath, type: 'unmodified' });
        } else if (!aOid) {
          result.push({ path: filepath, type: 'added' });
        } else if (!bOid) {
          result.push({ path: filepath, type: 'deleted' });
        } else {
          result.push({ path: filepath, type: 'modified' });
        }
        return filepath;
      },
    });
    return result;
  } catch (err) {
    logger.error({ dir, fromRef, toRef, err }, 'Failed to diff commits');
    throw err;
  }
}
