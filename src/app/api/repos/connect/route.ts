/**
 * POST /api/repos/connect — connect a new repository for the authenticated user.
 * Body: { owner: string, name: string }
 * Creates Repository record and triggers initial sync.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createOctokitForUser } from '@/lib/github/client';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const connectSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = connectSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const { owner, name } = parsed.data;

    // Check if already connected
    const existing = await db.repository.findFirst({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ error: 'Repository already connected. MVP supports single repo only.' }, { status: 409 });
    }

    // Verify repo exists and user has access
    const octokit = await createOctokitForUser(session.user.id);
    const { data: repoData } = await octokit.repos.get({ owner, repo: name });

    // Create repository record
    const repository = await db.repository.create({
      data: {
        userId: session.user.id,
        owner,
        name,
        githubId: repoData.id,
        fullName: repoData.full_name,
        private: repoData.private,
        description: repoData.description,
        defaultBranch: repoData.default_branch,
        cloneUrl: repoData.clone_url,
      },
    });

    // Create initial sync job
    const syncJob = await db.syncJob.create({
      data: {
        repositoryId: repository.id,
        status: 'PENDING',
        type: 'FULL',
      },
    });

    logger.info({ repositoryId: repository.id, jobId: syncJob.id }, 'Repository connected, initial sync queued');

    return NextResponse.json({ 
      repository: {
        id: repository.id,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
      },
      syncJobId: syncJob.id,
    }, { status: 201 });

  } catch (err) {
    logger.error({ err }, 'POST /api/repos/connect failed');

    if (isGitHubNotFoundError(err)) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isGitHubNotFoundError(error: unknown): error is { status: number } {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}
