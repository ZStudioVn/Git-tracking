/**
 * Incremental commit import strategy. (2A-01)
 * Uses cursor SHA to fetch only new commits since last sync. (D-05)
 */
import type { Octokit } from '@octokit/rest';
import { fetchCommitsSince } from '@/lib/github/commits';
import { getSyncCursor, setSyncCursor } from '@/lib/sync/cursor';
import { getExistingCommitShas } from '@/lib/sync/idempotency';
import { assertQuotaBudget } from '@/lib/github/rate-limit';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function syncCommits(
  octokit: Octokit,
  repositoryId: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<{ imported: number; skipped: number }> {
  await assertQuotaBudget(octokit);

  // Get cursor for incremental sync
  const cursorSha = await getSyncCursor(repositoryId, branchName);
  const since = cursorSha
    ? await getCursorDate(repositoryId, cursorSha)
    : undefined;

  const remoteCommits = await fetchCommitsSince(octokit, owner, repo, branchName, since);
  if (remoteCommits.length === 0) {
    logger.info({ branchName }, 'No new commits to sync');
    return { imported: 0, skipped: 0 };
  }

  const existingShas = await getExistingCommitShas(repositoryId);
  const newCommits = remoteCommits.filter((c) => !existingShas.has(c.sha));

  let imported = 0;
  for (const commit of newCommits) {
    await db.commit.create({
      data: {
        repositoryId,
        sha: commit.sha,
        message: commit.message,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        authoredAt: commit.authoredAt,
        committedAt: commit.committedAt,
        url: commit.url,
      },
    });
    imported++;
  }

  // Update cursor to the latest commit SHA
  if (remoteCommits[0]) {
    await setSyncCursor(repositoryId, branchName, remoteCommits[0].sha);
  }

  logger.info({ branchName, imported, skipped: remoteCommits.length - imported }, 'Commit sync done');
  return { imported, skipped: remoteCommits.length - imported };
}

async function getCursorDate(repositoryId: string, sha: string): Promise<Date | undefined> {
  const commit = await db.commit.findUnique({
    where: { repositoryId_sha: { repositoryId, sha } },
    select: { committedAt: true },
  });
  return commit?.committedAt;
}
