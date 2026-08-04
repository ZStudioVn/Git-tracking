import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOctokitForUser } from '@/lib/github/client';
import { fetchFileHistory } from '@/lib/github/file-history';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const path = req.nextUrl.searchParams.get('path');
  const revision = req.nextUrl.searchParams.get('revision') ?? undefined;
  if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
  const repo = await db.repository.findFirst({ where: { userId: session.user.id } });
  if (!repo) return NextResponse.json({ error: 'No repository connected' }, { status: 404 });
  try {
    const octokit = await createOctokitForUser(session.user.id);
    const history = await fetchFileHistory(octokit, repo.owner, repo.name, path, revision);
    return NextResponse.json({ path, revision: revision ?? repo.defaultBranch, history });
  } catch {
    return NextResponse.json({ error: 'Unable to load file history' }, { status: 502 });
  }
}
