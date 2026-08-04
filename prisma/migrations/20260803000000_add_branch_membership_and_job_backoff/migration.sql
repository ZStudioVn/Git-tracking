CREATE TABLE IF NOT EXISTS "BranchCommit" (
    "branchId" TEXT NOT NULL,
    "commitId" TEXT NOT NULL,
    CONSTRAINT "BranchCommit_pkey" PRIMARY KEY ("branchId", "commitId"),
    CONSTRAINT "BranchCommit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BranchCommit_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "BranchCommit_commitId_idx" ON "BranchCommit"("commitId");
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "SyncJob" ADD COLUMN IF NOT EXISTS "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "SyncJob_one_active_per_repository_idx"
  ON "SyncJob"("repositoryId") WHERE "status" IN ('PENDING', 'RUNNING');