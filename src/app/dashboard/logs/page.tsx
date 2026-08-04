'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  context: unknown;
  requestId: string | null;
  createdAt: string;
  repository: { fullName: string } | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState('');
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (query) params.set('q', query);
    if (cursor) params.set('cursor', cursor);
    setLoading(true);
    setError('');
    void fetch(`/api/system-logs?${params.toString()}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load logs');
      setLogs(data.logs ?? []);
      setNextCursor(data.nextCursor ?? null);
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : 'Unable to load logs');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [level, query, cursor]);

  const resetFilters = (nextLevel: string, nextQuery: string) => {
    setCursor(null);
    setLevel(nextLevel);
    setQuery(nextQuery);
  };

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">System logs</h1><p className="text-sm text-gray-500">Recent events and errors for your repositories.</p></div>
        <div className="flex gap-2"><input aria-label="Search logs" value={query} onChange={(event) => resetFilters(level, event.target.value)} placeholder="Search message" className="rounded border px-3 py-2 text-sm" /><select value={level} onChange={(event) => resetFilters(event.target.value, query)} className="rounded border px-3 py-2 text-sm"><option value="">All levels</option><option value="ERROR">Errors</option><option value="WARN">Warnings</option><option value="INFO">Info</option></select></div>
      </div>
      {error && <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-gray-500">Loading logs…</p> : logs.length === 0 ? <p className="rounded border p-6 text-sm text-gray-500">No logs match these filters.</p> : <div className="overflow-x-auto rounded border bg-white shadow"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-gray-50"><th className="p-3">Time</th><th className="p-3">Level</th><th className="p-3">Category</th><th className="p-3">Message</th><th className="p-3">Repository</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="cursor-pointer border-b last:border-0 hover:bg-blue-50" onClick={() => setSelected(log)}><td className="whitespace-nowrap p-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3 font-semibold">{log.level}</td><td className="p-3">{log.category}</td><td className="max-w-xl truncate p-3">{log.message}</td><td className="p-3">{log.repository?.fullName ?? '—'}</td></tr>)}</tbody></table></div>}
      <div className="mt-4 flex justify-end"><button disabled={!nextCursor || loading} onClick={() => setCursor(nextCursor)} className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">Next page</button></div>
      {selected && <div role="dialog" aria-label="Log detail" className="fixed inset-y-0 right-0 w-full max-w-lg overflow-y-auto border-l bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Log detail</h2><button onClick={() => setSelected(null)} className="text-sm underline">Close</button></div><dl className="mt-5 space-y-3 text-sm"><div><dt className="font-semibold">Message</dt><dd>{selected.message}</dd></div><div><dt className="font-semibold">Request ID</dt><dd className="font-mono">{selected.requestId ?? '—'}</dd></div><div><dt className="font-semibold">Context</dt><dd><pre className="mt-1 max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs">{JSON.stringify(selected.context, null, 2)}</pre></dd></div></dl></div>}
    </main>
  );
}
