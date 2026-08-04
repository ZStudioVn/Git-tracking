'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Blame { sha: string; message: string; authorName: string; authorLogin: string | null; committedAt: string; url: string }
interface Line { lineNumber: number; content: string; blame: Blame | null }
interface HistoryEntry { sha: string; message: string; authorName: string; committedAt: string; url: string }

export default function FilePage() {
  const params = useSearchParams();
  const router = useRouter();
  const path = params.get('path') ?? '';
  const revision = params.get('revision') ?? 'HEAD';
  const [lines, setLines] = useState<Line[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [blameError, setBlameError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [blameLoading, setBlameLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setBlameLoading(true); setHistoryLoading(true); setBlameError(''); setHistoryError('');
    const blameRequest = fetch(`/api/files/blame?path=${encodeURIComponent(path)}&revision=${encodeURIComponent(revision)}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load blame');
      setLines(data.lines ?? []);
    }).catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setBlameError(reason instanceof Error ? reason.message : 'Unable to load blame'); }).finally(() => setBlameLoading(false));
    const historyRequest = fetch(`/api/files/history?path=${encodeURIComponent(path)}&revision=${encodeURIComponent(revision)}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load history');
      setHistory(data.history ?? []);
    }).catch((reason: unknown) => { if (!(reason instanceof DOMException && reason.name === 'AbortError')) setHistoryError(reason instanceof Error ? reason.message : 'Unable to load history'); }).finally(() => setHistoryLoading(false));
    void Promise.all([blameRequest, historyRequest]);
    return () => controller.abort();
  }, [path, revision]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <button className="mb-4 text-sm underline" onClick={() => router.back()}>← Back</button>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">{path || 'File'}</h1>
        <p className="text-sm text-gray-500">Blame at <code>{revision}</code></p>
      </div>
      {blameError && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">Blame: {blameError}</p>}
      {blameLoading ? <p className="text-sm text-gray-500">Loading file blame…</p> : lines.length > 0 && (
        <section className="overflow-x-auto rounded border bg-white shadow">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {lines.map((line) => (
                <tr key={line.lineNumber} className="border-b last:border-0 hover:bg-blue-50/40">
                  <td className="w-14 select-none border-r px-3 py-1 text-right font-mono text-xs text-gray-400">{line.lineNumber}</td>
                  <td className="w-72 max-w-72 border-r px-3 py-1 align-top text-xs text-gray-500">
                    {line.blame ? (
                      <a href={line.blame.url} target="_blank" rel="noreferrer" className="block truncate hover:text-blue-700 hover:underline" title={`${line.blame.message} (${line.blame.sha.slice(0, 12)})`}>
                        <strong>{line.blame.authorName}</strong> · {line.blame.sha.slice(0, 8)}<br />
                        <span>{line.blame.message}</span>
                      </a>
                    ) : 'Unknown'}
                  </td>
                  <td className="whitespace-pre px-3 py-1 font-mono">{line.content || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {historyError && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">History: {historyError}</p>}
      {historyLoading ? <p className="mt-4 text-sm text-gray-500">Loading file history…</p> : history.length > 0 && (
        <section className="mt-6 rounded border bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">File history</h2>
          <div className="space-y-2">
            {history.map((entry) => <button key={entry.sha} className="block w-full border-b pb-2 text-left hover:text-blue-700" onClick={() => router.push(`/dashboard/commit/${entry.sha}`)}><span className="font-medium">{entry.message.split('\n')[0]}</span><span className="ml-2 text-xs text-gray-500">{entry.sha.slice(0, 8)} · {entry.authorName}</span></button>)}
          </div>
        </section>
      )}
    </main>
  );
}
