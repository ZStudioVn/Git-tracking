'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface CommitFile { path: string; oldPath?: string | null; status: string; additions: number; deletions: number; binary: boolean }
interface CommitDetail { sha: string; message: string; authorName: string; authorEmail: string; committedAt: string; url?: string | null; files: CommitFile[]; parents: { parent: { sha: string } }[] }

export default function CommitPage() {
  const { sha } = useParams<{ sha: string }>();
  const router = useRouter();
  const [commit, setCommit] = useState<CommitDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/commits/${encodeURIComponent(sha)}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Commit not found');
      else setCommit(data.commit);
    }).catch(() => setError('Failed to load commit'));
  }, [sha]);

  if (error) return <main className="p-6"><p className="text-red-600">{error}</p></main>;
  if (!commit) return <main className="p-6"><p>Loading commit…</p></main>;
  const parent = commit.parents[0]?.parent.sha;

  return <main className="p-6 max-w-5xl mx-auto space-y-6">
    <button className="text-sm underline" onClick={() => router.push('/dashboard')}>← Dashboard</button>
    <section className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{commit.message.split('\n')[0]}</h1><p className="text-sm text-gray-600 mt-2">{commit.authorName} · {new Date(commit.committedAt).toLocaleString()}</p></div>
        <code className="text-sm">{commit.sha.slice(0, 12)}</code>
      </div>
      <pre className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{commit.message}</pre>
      <div className="mt-4 flex gap-3">{parent && <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => router.push(`/dashboard/diff?base=${parent}&head=${commit.sha}`)}>Compare parent</button>}{commit.url && <a className="px-3 py-2 border rounded" href={commit.url} target="_blank" rel="noreferrer">Open on GitHub</a>}</div>
    </section>
    <section className="bg-white rounded-lg shadow p-6"><h2 className="text-lg font-semibold mb-3">Changed files ({commit.files.length})</h2><div className="space-y-2">{commit.files.map((file) => <div key={file.path} className="flex items-center justify-between border-b py-2 text-sm"><button className="font-mono text-blue-700 hover:underline" onClick={() => router.push(`/dashboard/file?path=${encodeURIComponent(file.path)}&revision=${encodeURIComponent(commit.sha)}`)}>{file.path}</button><span><span className="text-green-600 mr-2">+{file.additions}</span><span className="text-red-600">-{file.deletions}</span></span></div>)}</div></section>
  </main>;
}