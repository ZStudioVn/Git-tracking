'use client';

import { useRouter } from 'next/navigation';

/**
 * RepoSelector — lets the user pick the connected repository. (2C-02)
 * MVP: single-repo only; will expand to multi-repo in Phase 5.
 */

interface Props {
  currentRepo?: { owner: string; name: string } | null;
}

export function RepoSelector({ currentRepo }: Props) {
  const router = useRouter();

  if (!currentRepo) {
    return (
      <div className="text-sm text-muted-foreground">
        No repository connected.{' '}
        {/* TODO Phase 1: link to connect-repo flow */}
        <button className="underline" onClick={() => router.push('/setup')}>
          Connect a repository
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span>{currentRepo.owner}</span>
      <span>/</span>
      <span>{currentRepo.name}</span>
    </div>
  );
}
