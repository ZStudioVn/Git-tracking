/**
 * GET /api/commits?branch=<name>&limit=<n>&cursor=<sha> — fetch commit list.
 * Returns commits for the selected branch with pagination.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const branch = searchParams.get('branch') ?? 'main';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const cursor = searchParams.get('cursor'); // SHA to start after

  try {
    const repo = await db.repository.findFirst({
      where: { userId: session.user.id },
    });

    if (!repo) {
      return NextResponse.json({ error: 'No repository connected' }, { status: 404 });
    }

    const branchRecord = await db.branch.findUnique({
      where: { repositoryId_name: { repositoryId: repo.id, name: branch } },
      select: { headSha: true },
    });
    if (!branchRecord) return NextResponse.json({ error: `Branch not found: ${branch}` }, { status: 404 });

    // BranchCommit keeps the indexed DAG membership for this branch.
    const commits = await db.commit.findMany({
      where: {
        repositoryId: repo.id,
        branches: { some: { branch: { name: branch } } },
        ...(cursor ? { committedAt: { lt: await getCursorDate(repo.id, cursor) } } : {}),
      },
      orderBy: { committedAt: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more
      select: {
        sha: true,
        message: true,
        authorName: true,
        authorEmail: true,
        authoredAt: true,
        committedAt: true,
        url: true,
        parents: { select: { parent: { select: { sha: true } } } },
      },
    });

    const hasMore = commits.length > limit;
    const results = hasMore ? commits.slice(0, limit) : commits;
    const nextCursor = hasMore ? results[results.length - 1]?.sha : null;

    return NextResponse.json({
      commits: results.map((commit) => ({
        ...commit,
        parents: commit.parents.map(({ parent }) => parent.sha),
      })),
      nextCursor,
      hasMore,
    });

  } catch (err) {
    logger.error({ err, branch }, 'GET /api/commits failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getCursorDate(repositoryId: string, sha: string): Promise<Date> {
  const commit = await db.commit.findUnique({
    where: { repositoryId_sha: { repositoryId, sha } },
    select: { committedAt: true },
  });
  return commit?.committedAt ?? new Date();
}
