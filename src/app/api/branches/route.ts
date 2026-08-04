/**
 * GET /api/branches — fetch all branches for the connected repository.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  const session = await auth();
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

    const branches = await db.branch.findMany({
      where: { repositoryId: repo.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        headSha: true,
        isDefault: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ 
      branches,
      defaultBranch: repo.defaultBranch,
    });

  } catch (err) {
    logger.error({ err }, 'GET /api/branches failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
