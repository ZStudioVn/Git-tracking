import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { inspectLocalGit } from '@/lib/local-git';
import { z } from 'zod';
import { githubFullNameFromRemote } from '@/lib/github/remote';

function assertLocalOnly(request: NextRequest): void {
  const host = request.headers.get('host')?.split(':')[0];
  if (process.env.NODE_ENV === 'production' && process.env.LOCAL_PROJECT_ACCESS !== 'true') {
    throw new Error('Local project access is disabled');
  }
  if (host && !['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Local project access is only available on localhost');
  }
}

const schema = z.object({ rootPath: z.string().trim().min(1).max(1000), name: z.string().trim().min(1).max(120).optional() });

export async function GET(request: NextRequest) {
  try { assertLocalOnly(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Local access denied' }, { status: 403 }); }
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projects = await db.localProject.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  try { assertLocalOnly(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Local access denied' }, { status: 403 }); }
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid project path' }, { status: 400 });
  try {
    const status = await inspectLocalGit(parsed.data.rootPath);
    const fullName = githubFullNameFromRemote(status.remoteUrl);
    const repository = fullName
      ? await db.repository.findFirst({ where: { userId: session.user.id, fullName }, select: { id: true } })
      : null;
    const project = await db.localProject.upsert({
      where: { userId_rootPath: { userId: session.user.id, rootPath: status.rootPath } },
      create: { userId: session.user.id, repositoryId: repository?.id, name: parsed.data.name ?? status.rootPath.split(/[\\/]/).pop() ?? 'Project', ...status },
      update: { name: parsed.data.name ?? undefined, repositoryId: repository?.id, ...status, lastStatusAt: new Date() },
    });
    return NextResponse.json({ project, status }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not inspect project';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
