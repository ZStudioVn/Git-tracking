import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { recordSystemLog } from '@/lib/system-log';

const configSchema = z.object({
  repositoryId: z.string().cuid().optional().nullable(),
  authorName: z.string().trim().min(1).max(100),
  authorEmail: z.string().email().max(254),
  defaultBranch: z.string().trim().min(1).max(200).optional().nullable(),
  commitTemplate: z.string().max(200).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const configs = await db.gitConfig.findMany({ where: { userId: session.user.id }, orderBy: { repositoryId: 'asc' } });
  return NextResponse.json({ configs });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = configSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid config', details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  if (data.repositoryId) {
    const repository = await db.repository.findFirst({ where: { id: data.repositoryId, userId: session.user.id }, select: { id: true } });
    if (!repository) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }
  const scopeKey = data.repositoryId ? `${session.user.id}:repo:${data.repositoryId}` : `${session.user.id}:global`;
  const config = await db.gitConfig.upsert({
    where: { scopeKey },
    create: { ...data, scopeKey, userId: session.user.id },
    update: data,
  });
  await recordSystemLog({ level: 'INFO', category: 'audit.config', message: 'Git configuration updated', userId: session.user.id, repositoryId: data.repositoryId ?? undefined, context: { repositoryId: data.repositoryId, hasTemplate: Boolean(data.commitTemplate) } });
  return NextResponse.json({ config });
}
