/**
 * Shared sync-related TypeScript types.
 */

export type SyncJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STALE';
export type SyncJobType = 'FULL' | 'INCREMENTAL' | 'WEBHOOK';

export interface SyncJob {
  id: string;
  repositoryId: string;
  status: SyncJobStatus;
  type: SyncJobType;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncCursor {
  repositoryId: string;
  branchName: string;
  lastSyncedSha: string;
  syncedAt: Date;
}

export interface SyncResult {
  jobId: string;
  commitsImported: number;
  branchesUpdated: number;
  pullRequestsUpdated: number;
  errors: string[];
  durationMs: number;
}
