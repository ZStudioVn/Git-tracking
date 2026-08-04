import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOctokitForUser } from '@/lib/github/client';
import { commitFiles } from '@/lib/github/git-data';
import { z } from 'zod';

const schema = z.object({
  repositoryId: z.string().cuid(),
  branch: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(200),
  expectedHead: z.string().regex(/^[0-9a-f]{40}$/i).optional(),
  author: z.object({ name: z.string().trim().min(1).max(100), email: z.string().email().max(254) }).optional(),
  files: z.array(z.object({ path: z.string(), content: z.string(), mode: z.enum(['100644', '100755']).optional() })).min(1).max(50),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid commit request', details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const repository = await db.repository.findFirst({ where: { id: input.repositoryId, userId: session.user.id } });
  if (!repository) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  try {
    const octokit = await createOctokitForUser(session.user.id);
    const config = await db.gitConfig.findFirst({
      where: { userId: session.user.id, OR: [{ repositoryId: repository.id }, { repositoryId: null }] },
      orderBy: { repositoryId: 'asc' },
    });
    const author = input.author ?? (config ? { name: config.authorName, email: config.authorEmail } : undefined);
    const result = await commitFiles(octokit, repository.owner, repository.name, input.branch, input.message, input.files, input.expectedHead, author);
    return NextResponse.json({ commit: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Commit failed';
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
