/**
 * GET /api/diff?base=<sha>&head=<sha>&path=<filepath> — compare revisions. (3A-06)
 * - Without `path`: returns ComparisonResult (file list + stats only, no full patch)
 * - With `path`: returns LineDiff for that specific file (on-demand, D-04)
 * All params are included in URL for shareability. (D-08)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOctokitForUser } from '@/lib/github/client';
import { compareRevisions } from '@/lib/diff/compare';
import { getLineDiff } from '@/lib/diff/line-diff';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const base = searchParams.get('base');
  const head = searchParams.get('head');
  const path = searchParams.get('path');

  if (!base || !head) {
    return NextResponse.json({ error: 'base and head are required' }, { status: 400 });
  }

  try {
    const repo = await db.repository.findFirst({ where: { userId: session.user.id } });
    if (!repo) return NextResponse.json({ error: 'No repository connected' }, { status: 404 });

    const octokit = await createOctokitForUser(session.user.id);

    if (path) {
      const lineDiff = await getLineDiff(octokit, repo.owner, repo.name, base, head, path);
      return NextResponse.json({ lineDiff });
    }

    const comparison = await compareRevisions(octokit, repo.owner, repo.name, base, head);
    return NextResponse.json({ comparison });
  } catch (err) {
    logger.error({ err, base, head, path }, 'GET /api/diff failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
