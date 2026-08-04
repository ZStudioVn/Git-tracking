'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/toast';
import type { GitTrackingBridgeProject } from '@/types/desktop';

interface LocalProjectRow extends GitTrackingBridgeProject {
  lastStatusAt?: string | null;
}

function isDesktop(): boolean {
  return typeof window !== 'undefined' && typeof window.gitTracking !== 'undefined';
}

const CONFLICT_RE = /^(DD|AU|UD|UA|DU|AA|UU)/;

function conflictCountFor(project: LocalProjectRow): number {
  return (project.changes ?? []).filter((line) => CONFLICT_RE.test(line)).length;
}

export function LocalProjects() {
  const [projects, setProjects] = useState<LocalProjectRow[]>([]);
  const [manualPath, setManualPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/local-projects', { signal });
    if (!response.ok) throw new Error('Could not load local projects');
    const data = await response.json();
    setProjects(data.projects ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((cause: unknown) => {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'Could not load projects');
    });
    const interval = window.setInterval(() => {
      void load(controller.signal).catch(() => { /* silent background refresh */ });
    }, 30_000);
    const onRefresh = () => { void load().catch(() => { /* best-effort */ }); };
    window.addEventListener('git-tracking:local-refresh', onRefresh);
    window.addEventListener('focus', onRefresh);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('git-tracking:local-refresh', onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [load]);

  const addFromDesktopPicker = async () => {
    setError('');
    try {
      if (!window.gitTracking) throw new Error('Desktop bridge is not available');
      const picked = await window.gitTracking.projects.pick();
      if (!picked) return;
      const project = await window.gitTracking.projects.add(picked);
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      toast.success(`Added ${project.name}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not add project';
      setError(message);
      toast.error(message);
    }
  };

  const addFromPath = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/local-projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rootPath: manualPath }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add project');
      setManualPath('');
      await load();
      toast.success('Project added');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not add project';
      setError(message);
      toast.error(message);
    }
  };

  const removeProject = async (id: string) => {
    try {
      if (window.gitTracking) {
        await window.gitTracking.projects.remove(id);
      } else {
        const response = await fetch(`/api/local-projects/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Could not remove project');
      }
      setProjects((current) => current.filter((item) => item.id !== id));
      toast.info('Project removed');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not remove project');
    }
  };

  const refreshProject = async (id: string) => {
    try {
      if (window.gitTracking) {
        const result = await window.gitTracking.projects.refresh(id);
        setProjects((current) => current.map((item) => (item.id === id ? { ...item, ...(result as { project: LocalProjectRow }).project } : item)));
      } else {
        const response = await fetch(`/api/local-projects/${id}/status`);
        if (!response.ok) throw new Error('Could not refresh project');
        const data = await response.json();
        setProjects((current) => current.map((item) => (item.id === id ? { ...item, ...data.status } : item)));
      }
      toast.success('Project refreshed');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not refresh project');
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading local projects…</p>;

  return (
    <section className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Local projects</h2>
        <p className="text-sm text-gray-500">
          {isDesktop() ? 'Use the picker or a path to add a Git folder on this machine.' : 'This server reads folders on the same machine. Keep it on localhost.'}
        </p>
      </div>
      <div className="space-y-2">
        {isDesktop() && <button className="w-full rounded bg-blue-600 px-3 py-2 text-white" onClick={() => void addFromDesktopPicker()}>Add Project (choose folder)</button>}
        <form onSubmit={addFromPath} className="flex gap-2">
          <input className="min-w-0 flex-1 rounded border px-3 py-2 font-mono text-sm" placeholder={typeof window !== 'undefined' && navigator.platform.startsWith('Win') ? 'C:\\projects\\my-app' : '/home/me/projects/my-app'} value={manualPath} onChange={(event) => setManualPath(event.target.value)} />
          <button disabled={!manualPath.trim()} className="rounded border px-3 py-2 disabled:opacity-50">Add by path</button>
        </form>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-3">
        {projects.length === 0 ? (
          <p className="text-sm text-gray-500">No local project registered yet.</p>
        ) : (
          projects.map((project) => (
            <article key={project.id} className="rounded border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="break-all font-mono text-xs text-gray-500">{project.rootPath}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/dashboard/local/${project.id}`} className="rounded border border-blue-600 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50">Details</Link>
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => void refreshProject(project.id)}>Refresh</button>
                  <button className="rounded border px-2 py-1 text-xs text-red-600" onClick={() => void removeProject(project.id)}>Remove</button>
                </div>
              </div>
              {project.isGitRepo ? (
                <p className="mt-2 text-sm text-gray-600">
                  {project.branch ?? 'detached HEAD'} · {project.headSha?.slice(0, 8)} · {project.changes?.length ?? 0} changed item(s)
                  {conflictCountFor(project) > 0 && <span className="ml-2 font-medium text-red-600">{conflictCountFor(project)} conflict(s)</span>}
                  {(project.ahead ?? 0) > 0 && <span className="ml-2 text-blue-600">↑ {project.ahead}</span>}
                  {(project.behind ?? 0) > 0 && <span className="ml-2 text-amber-600">↓ {project.behind}</span>}
                  {project.changes && project.changes.length > 0 && (
                    <Link href={`/dashboard/local/${project.id}`} className="ml-2 text-blue-600 hover:underline">view diff</Link>
                  )}
                </p>
              ) : (
                <p className="mt-2 text-sm text-yellow-700">Not a Git repository</p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
