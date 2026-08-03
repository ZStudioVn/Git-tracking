/**
 * Sync cursor management.
 * Reads and writes the last-synced SHA per branch. (D-05)
 */
import { db } from '@/lib/db';

export async function getSyncCursor(
  repositoryId: string,
  branchName: string,
): Promise<string | null> {
  const cursor = await db.syncCursor.findUnique({
    where: { repositoryId_branchName: { repositoryId, branchName } },
  });
  return cursor?.lastSyncedSha ?? null;
}

export async function setSyncCursor(
  repositoryId: string,
  branchName: string,
  sha: string,
): Promise<void> {
  await db.syncCursor.upsert({
    where: { repositoryId_branchName: { repositoryId, branchName } },
    update: { lastSyncedSha: sha, syncedAt: new Date() },
    create: { repositoryId, branchName, lastSyncedSha: sha },
  });
}
