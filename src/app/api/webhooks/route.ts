import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isValidWebhookDeliveryId, verifyWebhookSignature } from '@/lib/github/webhooks';
import { recordSystemLog } from '@/lib/system-log';
import { rateLimit } from '@/lib/security/rate-limit';
import { getRequestId } from '@/lib/http/request-context';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = request.headers.get('x-hub-signature-256');
  const deliveryId = request.headers.get('x-github-delivery');
  const event = request.headers.get('x-github-event');
  const limit = rateLimit(`webhook:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 120, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many webhook requests', retryAfter: limit.retryAfter }, { status: 429, headers: { 'retry-after': String(limit.retryAfter), 'x-request-id': requestId } });

  if (!secret || !signature || !isValidWebhookDeliveryId(deliveryId) || !event) {
    return NextResponse.json({ error: 'Missing or invalid webhook headers' }, { status: 400, headers: { 'x-request-id': requestId } });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.byteLength > 2_000_000) return NextResponse.json({ error: 'Webhook payload too large' }, { status: 413, headers: { 'x-request-id': requestId } });
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    await recordSystemLog({ level: 'WARN', category: 'webhook', message: 'Rejected webhook with invalid signature', requestId, context: { deliveryId, event } });
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401, headers: { 'x-request-id': requestId } });
  }

  let payload: { repository?: { id?: number }; action?: string; sender?: { login?: string } };
  try {
    payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: { 'x-request-id': requestId } });
  }

  const repository = payload.repository?.id
    ? await db.repository.findUnique({ where: { githubId: payload.repository.id }, select: { id: true } })
    : null;

  try {
    await db.webhookDelivery.create({
      data: {
        deliveryId,
        repositoryId: repository?.id,
        event,
        action: payload.action,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ accepted: true, duplicate: true, requestId });
    }
    logger.error({ error, deliveryId, event }, 'Failed to persist GitHub webhook delivery');
    await recordSystemLog({ level: 'ERROR', category: 'webhook', message: 'Failed to persist webhook delivery', requestId, context: { error, deliveryId, event } });
    return NextResponse.json({ error: 'Failed to persist webhook' }, { status: 500 });
  }

  if (repository && shouldSyncEvent(event)) {
    const activeJob = await db.syncJob.findFirst({
      where: { repositoryId: repository.id, status: { in: ['PENDING', 'RUNNING'] } },
      select: { id: true },
    });
    if (!activeJob) {
      await db.syncJob.create({ data: { repositoryId: repository.id, type: 'INCREMENTAL' } });
    }
  }

  logger.info({ deliveryId, event, repositoryId: repository?.id, sender: payload.sender?.login }, 'GitHub webhook accepted');
  return NextResponse.json({ accepted: true, queued: Boolean(repository && shouldSyncEvent(event)), requestId }, { status: 202, headers: { 'x-request-id': requestId } });
}

function shouldSyncEvent(event: string): boolean {
  return event === 'push' || event === 'create' || event === 'delete' || event === 'release' || event === 'pull_request';
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
