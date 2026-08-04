'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Entry { sha: string; message: string; authorName: string; committedAt: string; url: string }
export default function FileHistoryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const path = params.get('path') ?? '';
  const revision = params.get('revision') ?? '';
  const [history, setHistory] = useState<Entry[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!path) return; fetch(`/api/files/history?path=${encodeURIComponent(path)}&revision=${encodeURIComponent(revision)}`).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setHistory(data.history ?? []); }).catch((e: Error) => setError(e.message)); }, [path, revision]);
  return <main className="p-6 max-w-4xl mx-auto"><button className="underline text-sm mb-4" onClick={() => router.back()}>← Back</button><section className="bg-white rounded-lg shadow p-6"><h1 className="text-xl font-semibold mb-1">File history</h1><p className="font-mono text-sm text-gray-600 mb-5">{path}</p>{error ? <p className="text-red-600">{error}</p> : history.length === 0 ? <p className="text-gray-500">No history found.</p> : <div className="space-y-3">{history.map((entry, index) => <div key={entry.sha} className="border-b pb-3"><div className="flex justify-between gap-3"><button className="font-medium text-blue-700 hover:underline text-left" onClick={() => router.push(`/dashboard/commit/${entry.sha}`)}>{entry.message.split('\n')[0]}</button><code className="text-xs">{entry.sha.slice(0, 8)}</code></div><p className="text-xs text-gray-500 mt-1">{entry.authorName} · {new Date(entry.committedAt).toLocaleString()} {index === 0 && '(selected revision)'}</p></div>)}</div>}</section></main>;
}