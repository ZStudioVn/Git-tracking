import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({ repositoryId: z.string().cuid().optional() });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const repository = parsed.data.repositoryId
    ? await db.repository.findFirst({ where: { id: parsed.data.repositoryId, userId: session.user.id } })
    : await db.repository.findFirst({ where: { userId: session.user.id } });
  if (!repository) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  const branch = repository.defaultBranch;
  return NextResponse.json({ commands: [
    { label: 'Check status', command: `git status --short --branch` },
    { label: 'Review diff', command: `git diff --stat && git diff` },
    { label: 'Set global author', command: `git config --global user.name "<name>" && git config --global user.email "<email>"` },
    { label: 'Set project author', command: `git config user.name "<name>" && git config user.email "<email>"` },
    { label: 'Commit staged changes', command: `git add -A && git commit -m "<message>"` },
    { label: 'Push current branch', command: `git push origin ${branch}` },
    { label: 'Deploy safely', command: `git status --short && git push origin ${branch}` },
  ], repository: { id: repository.id, fullName: repository.fullName, branch } });
}
