/**
 * Line-level diff generation. (3A-03)
 * Computed on demand from GitHub blob SHAs.
 * Cached by stable key: `${baseSHA}:${headSHA}:${path}`. (D-04)
 */
import type { Octokit } from '@octokit/rest';
import type { LineDiff } from '@/types/diff';
import { logger } from '@/lib/logger';

const MAX_BLOB_SIZE = 1_000_000; // 1MB — large file safeguard (3A-05)

export async function getLineDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string,
  path: string,
): Promise<LineDiff | null> {
  try {
    const { data } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });

    const file = data.files?.find((f) => f.filename === path);
    if (!file) return null;

    if (!file.patch) {
      return { path, patch: null, oversized: false, binary: true };
    }

    const patchSize = file.patch ? Buffer.byteLength(file.patch, 'utf8') : 0;
    if (file.changes > 10000 || patchSize > MAX_BLOB_SIZE) {
      logger.warn({ path, changes: file.changes }, 'Diff too large, truncating');
      return { path, patch: null, oversized: true, binary: false };
    }

    return { path, patch: file.patch, oversized: false, binary: false };
  } catch (err) {
    logger.error({ owner, repo, base, head, path, err }, 'Failed to get line diff');
    return null;
  }
}
