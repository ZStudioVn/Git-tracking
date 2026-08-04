/**
 * POST /api/sync — manual sync trigger. (2A-06)
 * Creates a PENDING SyncJob and kicks off incremental sync.
 * Plain cron + DB table for MVP — no BullMQ yet. (D-01)
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { runSyncJob } from '@/lib/sync/worker';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const limit = rateLimit(`sync:${session.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many sync requests' }, { status: 429, headers: { 'retry-after': String(limit.retryAfter) } });

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

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = rateLimit(`sync-retry:${session.user.id}`, 10, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many sync retry requests' }, { status: 429, headers: { 'retry-after': String(limit.retryAfter) } });

  try {
    const body = (await request.json()) as { jobId?: string };
    if (!body.jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    const job = await db.syncJob.findFirst({
      where: { id: body.jobId, repository: { userId: session.user.id }, status: 'FAILED' },
    });
    if (!job) return NextResponse.json({ error: 'Failed job not found' }, { status: 404 });
    const retry = await db.syncJob.create({
      data: { repositoryId: job.repositoryId, type: job.type, retryCount: job.retryCount, availableAt: new Date() },
    });
    void runSyncJob(retry.id);
    return NextResponse.json({ jobId: retry.id, status: retry.status }, { status: 202 });
  } catch (error) {
    logger.error({ error }, 'PATCH /api/sync failed');
    return NextResponse.json({ error: 'Invalid retry request' }, { status: 400 });
  }
}

export async function GET() {
  const session = await auth();
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
