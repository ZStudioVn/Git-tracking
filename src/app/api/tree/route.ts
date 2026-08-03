/**
 * GET /api/tree?revision=<sha|branch>&path=<treeSha> — fetch tree nodes. (2B-06)
 * Loads one folder level at a time (lazy loading). (D-08: every URL is shareable)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOctokitForUser } from '@/lib/github/client';
import { resolveRevisionToTree } from '@/lib/tree/resolver';
import { loadTreeFolder } from '@/lib/tree/loader';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const revision = searchParams.get('revision') ?? 'HEAD';
  const treeSha = searchParams.get('treeSha'); // if already resolved, skip resolution

  try {
    const repo = await db.repository.findFirst({ where: { userId: session.user.id } });
    if (!repo) return NextResponse.json({ error: 'No repository connected' }, { status: 404 });

    const octokit = await createOctokitForUser(session.user.id);
    const resolvedTreeSha = treeSha ?? await resolveRevisionToTree(octokit, repo.owner, repo.name, revision);
    const nodes = await loadTreeFolder(octokit, repo.owner, repo.name, resolvedTreeSha);

    return NextResponse.json({ treeSha: resolvedTreeSha, nodes });
  } catch (err) {
    logger.error({ err, revision }, 'GET /api/tree failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
