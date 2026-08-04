import type { Octokit } from '@octokit/rest';
import { db } from '@/lib/db';
import { fetchTags } from '@/lib/github/tags';
import { logger } from '@/lib/logger';

export async function syncTags(octokit: Octokit, repositoryId: string, owner: string, repo: string): Promise<void> {
  const tags = await fetchTags(octokit, owner, repo);
  for (const tag of tags) {
    await db.tag.upsert({
      where: { repositoryId_name: { repositoryId, name: tag.name } },
      update: { commitSha: tag.commitSha },
      create: { repositoryId, name: tag.name, commitSha: tag.commitSha },
    });
  }
  logger.info({ repositoryId, count: tags.length }, 'Tags synced');
}