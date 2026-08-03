/**
 * Pull request sync strategy. (2A-03)
 * Imports PR metadata only — no full diff (D-04).
 */
import type { Octokit } from '@octokit/rest';
import { fetchPullRequests } from '@/lib/github/pulls';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function syncPullRequests(
  octokit: Octokit,
  repositoryId: string,
  owner: string,
  repo: string,
): Promise<void> {
  const prs = await fetchPullRequests(octokit, owner, repo, 'all');

  for (const pr of prs) {
    await db.pullRequest.upsert({
      where: { repositoryId_number: { repositoryId, number: pr.number } },
      update: {
        title: pr.title,
        state: pr.state,
        headSha: pr.headSha,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
      },
      create: {
        repositoryId,
        githubId: pr.githubId,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        headSha: pr.headSha,
        baseBranch: pr.baseBranch,
        headBranch: pr.headBranch,
        authorLogin: pr.authorLogin,
        url: pr.url,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
      },
    });
  }

  logger.info({ repositoryId, count: prs.length }, 'Pull requests synced');
}
