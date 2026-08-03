/**
 * Idempotency helpers for sync operations. (2.3 — sync must be repeatable)
 * Uses commit SHA uniqueness to skip already-imported records.
 */
import { db } from '@/lib/db';

/**
 * Returns the set of SHAs already stored for a repository.
 * Use to filter out commits that don't need re-importing.
 */
export async function getExistingCommitShas(
  repositoryId: string,
): Promise<Set<string>> {
  const rows = await db.commit.findMany({
    where: { repositoryId },
    select: { sha: true },
  });
  return new Set(rows.map((r) => r.sha));
}

/**
 * Returns true if the given commit SHA already exists in the DB.
 */
export async function commitExists(
  repositoryId: string,
  sha: string,
): Promise<boolean> {
  const count = await db.commit.count({
    where: { repositoryId, sha },
  });
  return count > 0;
}
