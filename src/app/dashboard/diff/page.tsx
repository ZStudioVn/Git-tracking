/**
 * Diff workspace page. (3B-06)
 * URL: /dashboard/diff?base=<sha>&head=<sha>  (D-08: permalink)
 * Optional: &path=<filepath> to jump to a specific file diff.
 */
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

interface Props {
  searchParams: {
    base?: string;
    head?: string;
    path?: string;
  };
}

export default async function DiffPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/api/auth/signin');

  const { base, head, path } = searchParams;

  if (!base || !head) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Diff Workspace</h1>
        <p className="text-muted-foreground">
          Select two commits or branches to compare. URL format:{' '}
          <code>/dashboard/diff?base=&lt;sha&gt;&amp;head=&lt;sha&gt;</code>
        </p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Comparing Revisions</h1>
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-mono">{base}</span> → <span className="font-mono">{head}</span>
        {path && <> · file: <span className="font-mono">{path}</span></>}
      </p>
      {/* TODO Phase 3: render DiffViewer component */}
      <p className="text-muted-foreground">Phase 3 — Diff Workspace coming next.</p>
    </main>
  );
}
