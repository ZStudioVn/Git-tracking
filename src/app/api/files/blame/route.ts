import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchFileBlame } from '@/lib/github/blame';
import { isSafeRepositoryPath, isSafeRevision } from '@/lib/validation/git-input';
import { rateLimit } from '@/lib/security/rate-limit';
import { getRequestId } from '@/lib/http/request-context';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const limit = rateLimit(`blame:${request.headers.get('x-forwarded-for') ?? 'unknown'}`, 30, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests', requestId }, { status: 429, headers: { 'retry-after': String(limit.retryAfter), 'x-request-id': requestId } });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const path = request.nextUrl.searchParams.get('path');
  const revision = request.nextUrl.searchParams.get('revision');
  if (!path || !revision || !isSafeRepositoryPath(path) || !isSafeRevision(revision)) {
    return NextResponse.json({ error: 'Valid path and revision are required' }, { status: 400 });
  }

  const repositoryId = request.nextUrl.searchParams.get('repositoryId');
  const repo = await db.repository.findFirst({ where: { userId: session.user.id, ...(repositoryId ? { id: repositoryId } : {}) } });
  if (!repo) return NextResponse.json({ error: 'No repository connected' }, { status: 404 });

  try {
    const lines = await fetchFileBlame(session.user.id, repo.owner, repo.name, path, revision);
    return NextResponse.json({ path, revision, lines });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load blame';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
