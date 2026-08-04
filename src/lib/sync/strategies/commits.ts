/**
 * Incremental commit import strategy. (2A-01)
 * Uses cursor SHA to fetch only new commits since last sync. (D-05)
 */
import type { Octokit } from '@octokit/rest';
import { fetchCommitsSince } from '@/lib/github/commits';
import { fetchCommitFiles } from '@/lib/github/commits';
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
  const branch = await db.branch.findUnique({ where: { repositoryId_name: { repositoryId, name: branchName } } });
  if (!branch) throw new Error(`Branch ${branchName} must be synced before commits`);

  let imported = 0;
  for (const commit of newCommits) {
    const files = await fetchCommitFiles(octokit, owner, repo, commit.sha);
    const created = await db.commit.create({
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
    if (files.length) {
      await db.commitFile.createMany({
        data: files.map((file) => ({ commitId: created.id, ...file })),
        skipDuplicates: true,
      });
    }
    await db.branchCommit.upsert({
      where: { branchId_commitId: { branchId: branch.id, commitId: created.id } },
      update: {},
      create: { branchId: branch.id, commitId: created.id },
    });
    imported++;
  }

  // Resolve parent edges after the complete batch exists. GitHub returns
  // newest-first, so linking inside the insert loop loses older parents.
  const remoteBySha = new Map(remoteCommits.map((commit) => [commit.sha, commit]));
  const allIndexed = await db.commit.findMany({
    where: { repositoryId, sha: { in: remoteCommits.map((commit) => commit.sha) } },
    select: { id: true, sha: true },
  });
  const indexedBySha = new Map(allIndexed.map((commit) => [commit.sha, commit.id]));
  const parentShas = allIndexed.flatMap((commit) => remoteBySha.get(commit.sha)?.parents ?? []);
  const existingParents = await db.commit.findMany({
    where: { repositoryId, sha: { in: parentShas } },
    select: { id: true, sha: true },
  });
  for (const parent of existingParents) indexedBySha.set(parent.sha, parent.id);
  const parentEdges = allIndexed.flatMap((commit) =>
    (remoteBySha.get(commit.sha)?.parents ?? [])
      .map((parentSha) => {
        const parentId = indexedBySha.get(parentSha);
        return parentId ? { commitId: commit.id, parentId } : null;
      })
      .filter((edge): edge is { commitId: string; parentId: string } => edge !== null),
  );
  if (parentEdges.length) await db.commitParent.createMany({ data: parentEdges, skipDuplicates: true });

  if (allIndexed.length) {
    await db.branchCommit.createMany({
      data: allIndexed.map((commit) => ({ branchId: branch.id, commitId: commit.id })),
      skipDuplicates: true,
    });
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
