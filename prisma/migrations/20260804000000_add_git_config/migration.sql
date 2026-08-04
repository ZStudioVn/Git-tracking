CREATE TABLE "GitConfig" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repositoryId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "defaultBranch" TEXT,
    "commitTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GitConfig_scopeKey_key" ON "GitConfig"("scopeKey");
CREATE UNIQUE INDEX "GitConfig_repositoryId_key" ON "GitConfig"("repositoryId");
CREATE INDEX "GitConfig_userId_repositoryId_idx" ON "GitConfig"("userId", "repositoryId");

ALTER TABLE "GitConfig" ADD CONSTRAINT "GitConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitConfig" ADD CONSTRAINT "GitConfig_repositoryId_fkey"
  FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
