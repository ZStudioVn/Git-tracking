import { NextResponse } from 'next/server';
import { runScheduledSync } from '@/lib/sync/worker';

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || supplied !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await runScheduledSync();
  return NextResponse.json({ ok: true });
}