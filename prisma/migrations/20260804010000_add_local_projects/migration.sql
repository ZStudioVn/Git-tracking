CREATE TABLE "LocalProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "name" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "remoteUrl" TEXT,
    "branch" TEXT,
    "headSha" TEXT,
    "changes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isGitRepo" BOOLEAN NOT NULL DEFAULT false,
    "tracking" BOOLEAN NOT NULL DEFAULT true,
    "lastStatusAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LocalProject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LocalProject_userId_rootPath_key" ON "LocalProject"("userId", "rootPath");
CREATE INDEX "LocalProject_userId_repositoryId_idx" ON "LocalProject"("userId", "repositoryId");
ALTER TABLE "LocalProject" ADD CONSTRAINT "LocalProject_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocalProject" ADD CONSTRAINT "LocalProject_repositoryId_fkey"
  FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
