import { NextResponse } from 'next/server';
import { runScheduledSync } from '@/lib/sync/worker';
import { purgeExpiredOperationalData } from '@/lib/maintenance/retention';
import { getRequestId } from '@/lib/http/request-context';

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || supplied !== expected) return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401, headers: { 'x-request-id': requestId } });
  await runScheduledSync();
  const retention = await purgeExpiredOperationalData(Number(process.env.LOG_RETENTION_DAYS ?? 90));
  return NextResponse.json({ ok: true, retention, requestId }, { headers: { 'x-request-id': requestId } });
}
