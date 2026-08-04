import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { sha: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const repo = await db.repository.findFirst({ where: { userId: session.user.id } });
  if (!repo) return NextResponse.json({ error: 'No repository connected' }, { status: 404 });
  const commit = await db.commit.findUnique({
    where: { repositoryId_sha: { repositoryId: repo.id, sha: params.sha } },
    include: { files: true, parents: { include: { parent: { select: { sha: true } } } } },
  });
  if (!commit) return NextResponse.json({ error: 'Commit not found' }, { status: 404 });
  return NextResponse.json({ commit });
}