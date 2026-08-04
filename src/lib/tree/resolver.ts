/**
 * Revision → tree SHA resolution. (2B-01)
 * Resolves a branch name, tag, or commit SHA to a Git tree SHA via GitHub API.
 */
import type { Octokit } from '@octokit/rest';
import { AppError, createAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function resolveRevisionToTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  revision: string, // branch name, tag, or commit SHA
): Promise<string> {
  try {
    const { data } = await octokit.repos.getCommit({ owner, repo, ref: revision });
    return data.commit.tree.sha;
  } catch (err) {
    logger.error({ owner, repo, revision, err }, 'Failed to resolve revision to tree SHA');
    throw createAppError(AppError.TREE_RESOLVE_FAILED, `Cannot resolve revision: ${revision}`);
  }
}
