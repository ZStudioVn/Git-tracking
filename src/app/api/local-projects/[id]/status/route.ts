import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { inspectLocalGit } from '@/lib/local-git';
import { githubFullNameFromRemote } from '@/lib/github/remote';

export async function GET(_request: Request, context: { params: { id: string } }) {
  const host = _request.headers.get('host')?.split(':')[0];
  if (process.env.NODE_ENV === 'production' && process.env.LOCAL_PROJECT_ACCESS !== 'true') return NextResponse.json({ error: 'Local project access is disabled' }, { status: 403 });
  if (host && !['localhost', '127.0.0.1', '::1'].includes(host)) return NextResponse.json({ error: 'Local project access is only available on localhost' }, { status: 403 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = await db.localProject.findFirst({ where: { id: context.params.id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  try {
    const status = await inspectLocalGit(project.rootPath);
    const fullName = githubFullNameFromRemote(status.remoteUrl);
    const repository = fullName
      ? await db.repository.findFirst({ where: { userId: session.user.id, fullName }, select: { id: true } })
      : null;
    await db.localProject.update({ where: { id: project.id }, data: { repositoryId: repository?.id, ...status, lastStatusAt: new Date() } });
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not inspect project' }, { status: 400 });
  }
}
