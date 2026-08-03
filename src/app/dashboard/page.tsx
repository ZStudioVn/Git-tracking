/**
 * Dashboard home — repository overview. (2C-01)
 * Shows: repo info, branches, last sync status, commit graph entry point.
 * URL: /dashboard  (D-08: permalink)
 */
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Repository Dashboard</h1>
      {/* TODO Phase 2: render RepoSelector, CommitGraph, SyncStatus */}
      <p className="text-muted-foreground">
        Phase 2 — Git Navigation coming next.
      </p>
    </main>
  );
}
