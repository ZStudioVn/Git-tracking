/**
 * Prisma seed script — generates realistic test data. (1E-01)
 * Run: pnpm prisma db seed
 * Uses @faker-js/faker for realistic names/messages/timestamps. (SETUP.md §11)
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'seed@example.com' },
    update: {},
    create: {
      name: 'Seed User',
      email: 'seed@example.com',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
  });
  console.log('✅ User:', user.email);

  // ── Repository ────────────────────────────────────────────────────────────
  const repo = await prisma.repository.upsert({
    where: { fullName: 'acme/webapp' },
    update: {},
    create: {
      userId: user.id,
      githubId: 999_000_001,
      owner: 'acme',
      name: 'webapp',
      fullName: 'acme/webapp',
      private: false,
      description: 'Acme web application (seed)',
      defaultBranch: 'main',
    },
  });
  console.log('✅ Repository:', repo.fullName);

  // ── Commits (DAG — 50 commits with linear parent chain) ───────────────────
  const now = new Date();
  const commitShas: string[] = Array.from({ length: 50 }, () =>
    faker.git.commitSha()
  );

  const commitRecords = [];
  for (let i = 0; i < commitShas.length; i++) {
    const sha = commitShas[i];
    const authoredAt = new Date(now.getTime() - (50 - i) * 3_600_000);
    const record = await prisma.commit.upsert({
      where: { repositoryId_sha: { repositoryId: repo.id, sha } },
      update: {},
      create: {
        repositoryId: repo.id,
        sha,
        message: faker.git.commitMessage(),
        authorName: faker.person.fullName(),
        authorEmail: faker.internet.email(),
        authoredAt,
        committedAt: authoredAt,
        url: `https://github.com/acme/webapp/commit/${sha}`,
      },
    });
    commitRecords.push(record);
  }
  console.log(`✅ Commits: ${commitRecords.length}`);

  // ── CommitParent links (linear DAG) ───────────────────────────────────────
  for (let i = 1; i < commitRecords.length; i++) {
    await prisma.commitParent.upsert({
      where: {
        commitId_parentId: {
          commitId: commitRecords[i].id,
          parentId: commitRecords[i - 1].id,
        },
      },
      update: {},
      create: {
        commitId: commitRecords[i].id,
        parentId: commitRecords[i - 1].id,
      },
    });
  }
  console.log('✅ CommitParent links');

  // ── CommitFiles (10 records on last commit) ──────────────────────────────
  const fileStatuses = ['ADDED', 'MODIFIED', 'DELETED', 'RENAMED'] as const;
  const lastCommit = commitRecords[commitRecords.length - 1];
  for (let i = 0; i < 10; i++) {
    await prisma.commitFile.create({
      data: {
        commitId: lastCommit.id,
        path: `src/${faker.system.fileName()}`,
        status: fileStatuses[i % fileStatuses.length],
        additions: faker.number.int({ min: 0, max: 200 }),
        deletions: faker.number.int({ min: 0, max: 100 }),
        binary: false,
      },
    });
  }
  console.log('✅ CommitFiles: 10');

  // ── Branches ──────────────────────────────────────────────────────────────
  const branches = [
    { name: 'main', headSha: commitShas[49], isDefault: true },
    { name: 'feature/login', headSha: commitShas[35], isDefault: false },
    { name: 'bugfix/typo', headSha: commitShas[20], isDefault: false },
  ];

  for (const b of branches) {
    await prisma.branch.upsert({
      where: { repositoryId_name: { repositoryId: repo.id, name: b.name } },
      update: { headSha: b.headSha },
      create: { repositoryId: repo.id, ...b },
    });
  }
  console.log('✅ Branches: 3');

  // ── Pull Requests ─────────────────────────────────────────────────────────
  const prs = [
    { githubId: 1, number: 1, title: 'Add login feature', state: 'OPEN' as const, baseBranch: 'main', headBranch: 'feature/login', headSha: commitShas[35] },
    { githubId: 2, number: 2, title: 'Fix typo in README', state: 'MERGED' as const, baseBranch: 'main', headBranch: 'bugfix/typo', headSha: commitShas[20], mergedAt: new Date() },
    { githubId: 3, number: 3, title: 'Update deps', state: 'MERGED' as const, baseBranch: 'main', headBranch: 'chore/deps', headSha: commitShas[10], mergedAt: new Date() },
  ];

  for (const pr of prs) {
    await prisma.pullRequest.upsert({
      where: { repositoryId_number: { repositoryId: repo.id, number: pr.number } },
      update: {},
      create: {
        repositoryId: repo.id,
        ...pr,
        authorLogin: faker.internet.userName(),
        url: `https://github.com/acme/webapp/pull/${pr.number}`,
      },
    });
  }
  console.log('✅ PullRequests: 3');

  // ── SyncJobs ──────────────────────────────────────────────────────────────
  await prisma.syncJob.createMany({
    data: [
      { repositoryId: repo.id, status: 'COMPLETED', type: 'FULL', startedAt: new Date(now.getTime() - 60_000), completedAt: now },
      { repositoryId: repo.id, status: 'RUNNING', type: 'INCREMENTAL', startedAt: now },
      { repositoryId: repo.id, status: 'FAILED', type: 'INCREMENTAL', errorMessage: 'GitHub API rate limit exceeded' },
    ],
  });
  console.log('✅ SyncJobs: 3');

  // ── SyncCursors ───────────────────────────────────────────────────────────
  await prisma.syncCursor.upsert({
    where: { repositoryId_branchName: { repositoryId: repo.id, branchName: 'main' } },
    update: { lastSyncedSha: commitShas[49] },
    create: { repositoryId: repo.id, branchName: 'main', lastSyncedSha: commitShas[49] },
  });
  console.log('✅ SyncCursors: 1');

  console.log('\n🎉 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

