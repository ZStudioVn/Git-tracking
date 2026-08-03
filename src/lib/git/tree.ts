/**
 * Local tree reading via isomorphic-git. (2B-04, D-02)
 */
import git from 'isomorphic-git';
import fs from 'fs';
import { logger } from '@/lib/logger';

export interface LocalTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  oid: string;
  mode: string;
}

export async function readLocalTree(
  dir: string,
  ref = 'HEAD',
): Promise<LocalTreeEntry[]> {
  try {
    const entries: LocalTreeEntry[] = [];
    await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref })],
      map: async (filepath, [entry]) => {
        if (!entry || filepath === '.') return null;
        const type = await entry.type();
        const oid = await entry.oid();
        const mode = await entry.mode();
        entries.push({ path: filepath, type: type as 'blob' | 'tree', oid, mode: String(mode) });
        return filepath;
      },
    });
    return entries;
  } catch (err) {
    logger.error({ dir, ref, err }, 'Failed to read local tree');
    throw err;
  }
}
