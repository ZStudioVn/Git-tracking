/**
 * Local commit log via isomorphic-git. (2B-03, D-02)
 * Used when reading local repo history not yet pushed to GitHub.
 */
import git from 'isomorphic-git';
import fs from 'fs';
import { logger } from '@/lib/logger';

export interface LocalCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  parentShas: string[];
}

export async function getLocalLog(
  dir: string,
  ref = 'HEAD',
  depth = 100,
): Promise<LocalCommit[]> {
  try {
    const commits = await git.log({ fs, dir, ref, depth });
    return commits.map((entry) => ({
      sha: entry.oid,
      message: entry.commit.message.trim(),
      authorName: entry.commit.author.name,
      authorEmail: entry.commit.author.email,
      committedAt: new Date(entry.commit.committer.timestamp * 1000),
      parentShas: entry.commit.parent,
    }));
  } catch (err) {
    logger.error({ dir, ref, err }, 'Failed to read local git log');
    throw err;
  }
}
