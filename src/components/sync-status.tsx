'use client';

/**
 * SyncStatus — shows last sync time, job status, errors, retry button. (4C-01, 2C-05)
 * Also shows local-vs-remote badge: "X commits ahead/behind" (D-07).
 */

export type SyncStatusValue = 'idle' | 'running' | 'completed' | 'failed' | 'stale';

interface Props {
  status: SyncStatusValue;
  lastSyncedAt?: Date | null;
  errorMessage?: string | null;
  aheadBy?: number;
  behindBy?: number;
  onManualSync?: () => void;
  onReconnect?: () => void;
}

export function SyncStatus({
  status,
  lastSyncedAt,
  errorMessage,
  aheadBy,
  behindBy,
  onManualSync,
  onReconnect,
}: Props) {
  const statusLabel: Record<SyncStatusValue, string> = {
    idle: 'Up to date',
    running: 'Syncing…',
    completed: 'Synced',
    failed: 'Sync failed',
    stale: 'Token expired',
  };

  return (
    <div className="text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'completed' || status === 'idle'
              ? 'bg-green-500'
              : status === 'running'
              ? 'bg-yellow-400 animate-pulse'
              : 'bg-red-500'
          }`}
        />
        <span>{statusLabel[status]}</span>
        {lastSyncedAt && (
          <span className="text-muted-foreground">
            · {lastSyncedAt.toLocaleTimeString()}
          </span>
        )}
        {typeof aheadBy === 'number' && aheadBy > 0 && (
          <span className="text-blue-500">↑ {aheadBy} ahead</span>
        )}
        {typeof behindBy === 'number' && behindBy > 0 && (
          <span className="text-orange-500">↓ {behindBy} behind</span>
        )}
      </div>

      {errorMessage && (
        <p className="text-red-500">{errorMessage}</p>
      )}

      {status === 'stale' && onReconnect && (
        <button onClick={onReconnect} className="underline text-orange-500">
          Reconnect GitHub
        </button>
      )}

      {(status === 'idle' || status === 'failed' || status === 'completed') && onManualSync && (
        <button onClick={onManualSync} className="underline">
          Sync now
        </button>
      )}
    </div>
  );
}
