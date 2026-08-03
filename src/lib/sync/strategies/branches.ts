/**
 * Branch sync strategy. (2A-02)
 * Upserts branches from GitHub, marking the default branch.
 */
import type { Octokit } from '@octokit/rest';
import { fetchBranches } from '@/lib/github/branches';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function syncBranches(
  octokit: Octokit,
  repositoryId: string,
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<void> {
  const branches = await fetchBranches(octokit, owner, repo, defaultBranch);

  for (const branch of branches) {
    await db.branch.upsert({
      where: { repositoryId_name: { repositoryId, name: branch.name } },
      update: { headSha: branch.headSha, isDefault: branch.isDefault },
      create: {
        repositoryId,
        name: branch.name,
        headSha: branch.headSha,
        isDefault: branch.isDefault,
      },
    });
  }

  logger.info({ repositoryId, count: branches.length }, 'Branches synced');
}
