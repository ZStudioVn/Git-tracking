/**
 * POST /api/sync — manual sync trigger. (2A-06)
 * Creates a PENDING SyncJob and kicks off incremental sync.
 * Plain cron + DB table for MVP — no BullMQ yet. (D-01)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { runSyncJob } from '@/lib/sync/worker';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repo = await db.repository.findFirst({
      where: { userId: session.user.id },
    });

    if (!repo) {
      return NextResponse.json({ error: 'No repository connected' }, { status: 404 });
    }

    const active = await db.syncJob.findFirst({ where: { repositoryId: repo.id, status: { in: ['PENDING', 'RUNNING'] } }, orderBy: { createdAt: 'desc' } });
    if (active) return NextResponse.json({ jobId: active.id, status: active.status }, { status: 202 });

    // Create a sync job record (state machine — D-01)
    const job = await db.syncJob.create({
      data: {
        repositoryId: repo.id,
        status: 'PENDING',
        type: 'INCREMENTAL',
      },
    });

    logger.info({ jobId: job.id, repoId: repo.id }, 'Manual sync job created');

    // Start immediately for serverless/manual usage. The DB job remains the source
    // of truth, so a cron poller can safely pick it up if this process is interrupted.
    void runSyncJob(job.id);
    return NextResponse.json({ jobId: job.id, status: 'PENDING' }, { status: 202 });
  } catch (err) {
    logger.error({ err }, 'POST /api/sync failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repo = await db.repository.findFirst({
      where: { userId: session.user.id },
    });
    if (!repo) return NextResponse.json({ jobs: [] });

    const jobs = await db.syncJob.findMany({
      where: { repositoryId: repo.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        type: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
        retryCount: true,
        createdAt: true,
        availableAt: true,
      },
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    logger.error({ err }, 'GET /api/sync failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
