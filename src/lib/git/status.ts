/**
 * Working tree status via isomorphic-git. (D-02)
 * Shows local uncommitted / staged / unstaged changes.
 * Separates local state from remote state as per core principle 2.2.
 */
import git from 'isomorphic-git';
import fs from 'fs';
import { logger } from '@/lib/logger';

export type LocalFileStatus =
  | 'unmodified'
  | 'ignored'
  | 'untracked'
  | 'modified'
  | 'deleted'
  | 'added'
  | 'absent';

export interface WorkingTreeStatus {
  path: string;
  status: LocalFileStatus;
}

export async function getWorkingTreeStatus(dir: string): Promise<WorkingTreeStatus[]> {
  try {
    const matrix = await git.statusMatrix({ fs, dir });
    return matrix.map(([path, head, workdir, stage]) => ({
      path: path as string,
      status: deriveStatus(head as number, workdir as number, stage as number),
    }));
  } catch (err) {
    logger.error({ dir, err }, 'Failed to get working tree status');
    throw err;
  }
}

function deriveStatus(head: number, workdir: number, stage: number): LocalFileStatus {
  if (head === 1 && workdir === 1 && stage === 1) return 'unmodified';
  if (head === 0 && workdir === 2 && stage === 0) return 'untracked';
  if (head === 0 && workdir === 2 && stage === 2) return 'added';
  if (head === 1 && workdir === 2 && stage === 1) return 'modified';
  if (head === 1 && workdir === 0 && stage === 0) return 'deleted';
  return 'absent';
}
