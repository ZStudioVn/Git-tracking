/**
 * Merge base calculation. (3A-01)
 * Uses GitHub's compare API to find the merge base commit.
 */
import type { Octokit } from '@octokit/rest';
import { logger } from '@/lib/logger';

export async function getMergeBase(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });
    return data.merge_base_commit.sha;
  } catch (err) {
    logger.warn({ owner, repo, base, head, err }, 'Failed to get merge base');
    return null;
  }
}
