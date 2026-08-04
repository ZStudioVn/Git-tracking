'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/toast';
import type { GitTrackingBridgeProject, GitRunResult } from '@/types/desktop';

interface Command {
  label: string;
  command: string;
}

interface Props {
  repositoryId: string;
  repositoryName: string;
  defaultBranch: string;
  headSha?: string;
}

/** Commands that are safe to execute directly via the desktop bridge. */
function runnableArgs(label: string, branch: string): string[] | null {
  switch (label) {
    case 'Check status':
      return ['status', '--short', '--branch'];
    case 'Review diff':
      return ['diff', '--stat'];
    case 'Push current branch':
      return ['push', 'origin', branch];
    case 'Deploy safely':
      return ['status', '--short'];
    default:
      return null;
  }
}

export function GitCommandCenter({ repositoryId, repositoryName, defaultBranch, headSha }: Props) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [copied, setCopied] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const toast = useToast();

  const isDesktop = typeof window !== 'undefined' && !!window.gitTracking?.git?.run;
  const [localProjects, setLocalProjects] = useState<GitTrackingBridgeProject[]>([]);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [runningLabel, setRunningLabel] = useState('');
  const [runResult, setRunResult] = useState<GitRunResult & { label: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/git/commands', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId }), signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Could not load commands');
      const data = await res.json();
      setCommands(data.commands ?? []);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error);
    });
    return () => controller.abort();
  }, [repositoryId]);

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    void window.gitTracking?.projects.list().then((projects) => {
      if (cancelled) return;
      setLocalProjects(projects as GitTrackingBridgeProject[]);
      if (projects.length > 0) setTargetProjectId((projects as GitTrackingBridgeProject[])[0].id);
    }).catch(() => { /* projects list is best-effort */ });
    return () => { cancelled = true; };
  }, [isDesktop]);

  const targetProject = useMemo(
    () => localProjects.find((project) => project.id === targetProjectId) ?? null,
    [localProjects, targetProjectId],
  );

  const copy = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopied(command);
    window.setTimeout(() => setCopied(''), 1500);
  };

  const saveConfig = async (repositoryScoped: boolean) => {
    setSaving(true);
    try {
      const res = await fetch('/api/git/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: repositoryScoped ? repositoryId : null, authorName, authorEmail, defaultBranch, commitTemplate: null }),
      });
      if (!res.ok) throw new Error('Could not save commit config');
      toast.success(repositoryScoped ? 'Commit config saved for this project' : 'Commit config saved as global default');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save commit config');
    } finally { setSaving(false); }
  };

  const commitAndPush = async () => {
    setCommitting(true);
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId, branch: defaultBranch, message: message.trim(), expectedHead: headSha, files: [{ path: filePath, content: fileContent }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Commit failed');
      toast.success(`Committed and pushed: ${data.commit.sha.slice(0, 8)}`);
      setFileContent('');
      setMessage('');
      window.dispatchEvent(new CustomEvent('git-tracking:local-refresh'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Commit failed');
    } finally { setCommitting(false); }
  };

  const runCommand = async (item: Command) => {
    const args = runnableArgs(item.label, defaultBranch);
    if (!args || !targetProject || !window.gitTracking?.git?.run) return;
    setRunningLabel(item.label);
    setRunResult(null);
    try {
      const result = await window.gitTracking.git.run(targetProject.rootPath, args);
      setRunResult({ ...result, label: item.label });
      if (result.code === 0) {
        toast.success(`Ran ${item.label} in ${targetProject.name}`);
        window.dispatchEvent(new CustomEvent('git-tracking:local-refresh'));
      }
    } catch (error) {
      setRunResult({ label: item.label, code: 1, stdout: '', stderr: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunningLabel('');
    }
  };

  const runError = runResult && runResult.code !== 0 ? runResult.stderr || `exit code ${runResult.code}` : '';

  return (
    <section className="mt-6 rounded-lg bg-white p-6 shadow">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Git command center</h2>
        <p className="text-sm text-gray-500">{repositoryName} · default branch: {defaultBranch}</p>
      </div>

      <div className="mb-6 grid gap-2">
        {commands.map((item) => {
          const args = runnableArgs(item.label, defaultBranch);
          const canRun = isDesktop && args !== null && !!targetProject;
          return (
            <div key={item.label} className="flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded bg-gray-100 px-3 py-2 text-sm">{item.command}</code>
              {canRun && (
                <button
                  className="rounded border border-green-600 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                  disabled={runningLabel !== ''}
                  onClick={() => void runCommand(item)}
                  title={`Run in ${targetProject.name}`}
                >
                  {runningLabel === item.label ? 'Running…' : 'Run'}
                </button>
              )}
              <button className="rounded border px-3 py-2 text-sm" onClick={() => void copy(item.command)}>{copied === item.command ? 'Copied' : 'Copy'}</button>
            </div>
          );
        })}
      </div>

      {isDesktop && (
        <div className="border-t pt-4">
          <h3 className="mb-2 font-medium">Run in local project (desktop)</h3>
          <select
            className="mb-2 w-full rounded border px-3 py-2 text-sm"
            value={targetProjectId}
            onChange={(event) => setTargetProjectId(event.target.value)}
          >
            {localProjects.length === 0 && <option value="">No local project registered</option>}
            {localProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name} — {project.branch ?? 'no branch'}</option>
            ))}
          </select>
          {runResult && (
            <div className="rounded border bg-gray-950 p-3 text-xs">
              <p className="mb-1 font-mono text-gray-400">$ git {runnableArgs(runResult.label, defaultBranch)?.join(' ')}</p>
              {runError && <p className="mb-1 font-mono text-red-400">{runError}</p>}
              {runResult.stdout && <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-green-300">{runResult.stdout}</pre>}
            </div>
          )}
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="mb-2 font-medium">Commit identity</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded border px-3 py-2" placeholder="Author name" value={authorName} onChange={(event) => setAuthorName(event.target.value)} />
          <input className="rounded border px-3 py-2" placeholder="Author email" type="email" value={authorEmail} onChange={(event) => setAuthorEmail(event.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={saving || !authorName || !authorEmail} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50" onClick={() => void saveConfig(true)}>Save for this project</button>
          <button disabled={saving || !authorName || !authorEmail} className="rounded border px-3 py-2 disabled:opacity-50" onClick={() => void saveConfig(false)}>Save as global default</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">The web app generates commands and GitHub commits; it never executes local shell commands or force-pushes.</p>
      </div>

      <div className="mt-4 border-t pt-4">
        <h3 className="mb-2 font-medium">Quick commit + push</h3>
        <div className="grid gap-2">
          <input className="rounded border px-3 py-2" placeholder="Commit message" value={message} onChange={(event) => setMessage(event.target.value)} />
          <input className="rounded border px-3 py-2 font-mono" placeholder="Path, e.g. docs/notes.md" value={filePath} onChange={(event) => setFilePath(event.target.value)} />
          <textarea className="min-h-28 rounded border px-3 py-2 font-mono text-sm" placeholder="File content" value={fileContent} onChange={(event) => setFileContent(event.target.value)} />
        </div>
        <button
          disabled={committing || !message.trim() || !filePath.trim() || !headSha}
          className="mt-3 rounded bg-green-600 px-3 py-2 text-white disabled:opacity-50"
          onClick={() => void commitAndPush()}
        >
          {committing ? 'Committing…' : `Commit and push to ${defaultBranch}`}
        </button>
      </div>
    </section>
  );
}
