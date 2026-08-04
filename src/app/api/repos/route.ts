/**
 * GET /api/repos — fetch the connected repository info. (2B-05)
 * Single-repo MVP: returns the one repo connected for the current user.
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
      select: {
        id: true,
        owner: true,
        name: true,
        fullName: true,
        private: true,
        description: true,
        defaultBranch: true,
        updatedAt: true,
      },
    });

    if (!repo) {
      return NextResponse.json({ repo: null }, { status: 200 });
    }

    return NextResponse.json({ repo });
  } catch (err) {
    logger.error({ err }, 'GET /api/repos failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
