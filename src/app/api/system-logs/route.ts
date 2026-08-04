import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/security/rate-limit';
import { getRequestId } from '@/lib/http/request-context';

const LEVELS = new Set(['INFO', 'WARN', 'ERROR']);

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const limitResult = rateLimit(`logs:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 60, 60_000);
  if (!limitResult.allowed) return NextResponse.json({ error: 'Too many requests', requestId }, { status: 429, headers: { 'retry-after': String(limitResult.retryAfter), 'x-request-id': requestId } });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const level = params.get('level');
  const category = params.get('category');
  const search = params.get('q')?.trim().slice(0, 200);
  const limit = Math.min(Math.max(Number(params.get('limit') ?? 50) || 50, 1), 100);
  const cursor = params.get('cursor');
  if (level && !LEVELS.has(level)) return NextResponse.json({ error: 'Invalid level' }, { status: 400 });

  try {
    const logs = await db.systemLog.findMany({
      where: {
        userId: session.user.id,
        ...(level ? { level: level as 'INFO' | 'WARN' | 'ERROR' } : {}),
        ...(category ? { category: category.slice(0, 80) } : {}),
        ...(search ? { message: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, level: true, category: true, message: true, context: true, requestId: true, createdAt: true, repository: { select: { fullName: true } } },
    });
    const hasMore = logs.length > limit;
    const visibleLogs = hasMore ? logs.slice(0, limit) : logs;
    return NextResponse.json({ logs: visibleLogs, nextCursor: hasMore ? visibleLogs.at(-1)?.id ?? null : null, requestId }, { headers: { 'x-request-id': requestId } });
  } catch (error) {
    logger.error({ error }, 'GET /api/system-logs failed');
    return NextResponse.json({ error: 'Unable to load system logs' }, { status: 500 });
  }
}
