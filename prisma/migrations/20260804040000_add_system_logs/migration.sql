CREATE TYPE "SystemLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "repositoryId" TEXT,
    "level" "SystemLogLevel" NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemLog_userId_createdAt_idx" ON "SystemLog"("userId", "createdAt");
CREATE INDEX "SystemLog_repositoryId_createdAt_idx" ON "SystemLog"("repositoryId", "createdAt");
CREATE INDEX "SystemLog_level_createdAt_idx" ON "SystemLog"("level", "createdAt");
CREATE INDEX "SystemLog_category_createdAt_idx" ON "SystemLog"("category", "createdAt");

ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
