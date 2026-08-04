/**
 * Background sync worker — orchestrates sync strategies.
 * Phase 1: Simple implementation using DB-based job queue (no BullMQ yet).
 * Phase 4: Upgrade to BullMQ for production.
 */
import { db } from '@/lib/db';
import { createOctokit } from '@/lib/github/client';
import { syncCommits } from '@/lib/sync/strategies/commits';
import { syncBranches } from '@/lib/sync/strategies/branches';
import { syncPullRequests } from '@/lib/sync/strategies/pulls';
import { syncTags } from '@/lib/sync/strategies/tags';
import { logger } from '@/lib/logger';

export async function runSyncJob(jobId: string): Promise<void> {
  const job = await db.syncJob.findUnique({
    where: { id: jobId },
    include: { repository: { include: { user: true } } },
  });

  if (!job) {
    logger.error({ jobId }, 'Sync job not found');
    return;
  }

  if (job.status !== 'PENDING') {
    logger.warn({ jobId, status: job.status }, 'Job already processed');
    return;
  }

  const claimed = await db.syncJob.updateMany({
    where: { id: jobId, status: 'PENDING', availableAt: { lte: new Date() } },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
  if (claimed.count !== 1) return;

  const startTime = Date.now();

  try {
    const { repository } = job;
    const account = await db.account.findFirst({
      where: { userId: repository.userId, provider: 'github' },
    });

    if (!account?.access_token) {
      throw new Error('No GitHub token found for user');
    }

    const octokit = createOctokit(account.access_token);

    logger.info(
      { jobId, repoId: repository.id, owner: repository.owner, name: repository.name },
      'Starting sync job'
    );

    await syncBranches(octokit, repository.id, repository.owner, repository.name, repository.defaultBranch);
    const branches = await db.branch.findMany({ where: { repositoryId: repository.id, deletedAt: null }, select: { name: true } });
    const commitResult = await syncCommits(
      octokit,
      repository.id,
      repository.owner,
      repository.name,
      repository.defaultBranch,
    );
    for (const branch of branches.filter((item) => item.name !== repository.defaultBranch)) {
      await syncCommits(octokit, repository.id, repository.owner, repository.name, branch.name);
    }
    await syncPullRequests(octokit, repository.id, repository.owner, repository.name);
    await syncTags(octokit, repository.id, repository.owner, repository.name);

    const duration = Date.now() - startTime;

    await db.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info(
      {
        jobId,
        commits: commitResult.imported,
        duration,
      },
      'Sync job completed'
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error({ jobId, error: message, stack }, 'Sync job failed');

    await db.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: message,
        retryCount: { increment: 1 },
      },
    });

    // Make temporary failures visible to the poller again with bounded retries.
    const updatedJob = await db.syncJob.findUnique({ where: { id: jobId } });
    const isAuthFailure = /401|403|token|GitHub account is not connected/i.test(message);
    if (isAuthFailure) {
      await db.syncJob.update({ where: { id: jobId }, data: { status: 'STALE' } });
    }
    if (updatedJob && updatedJob.retryCount < 3 && !isAuthFailure) {
      await db.syncJob.create({
        data: {
          repositoryId: updatedJob.repositoryId,
          type: updatedJob.type,
          status: 'PENDING',
          errorMessage: `Retry ${updatedJob.retryCount} scheduled after job ${jobId}`,
          retryCount: updatedJob.retryCount,
          availableAt: new Date(Date.now() + 2 ** updatedJob.retryCount * 60_000),
        },
      });
      logger.info({ jobId, retryCount: updatedJob.retryCount }, 'Retry job scheduled');
    }
  }
}

/**
 * Poll for pending sync jobs and process them.
 * This is a simple implementation for MVP.
 * Phase 4: Replace with BullMQ workers.
 */
export async function pollSyncJobs(): Promise<void> {
  const pendingJobs = await db.syncJob.findMany({
    where: { status: 'PENDING', availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: 5, // Process up to 5 jobs concurrently
  });

  if (pendingJobs.length === 0) {
    return;
  }

  logger.info({ count: pendingJobs.length }, 'Processing pending sync jobs');

  await Promise.allSettled(
    pendingJobs.map((job) => runSyncJob(job.id))
  );
}

/** Entry point for a host cron (for example every 5 minutes). */
export async function runScheduledSync(): Promise<void> {
  await pollSyncJobs();
}
