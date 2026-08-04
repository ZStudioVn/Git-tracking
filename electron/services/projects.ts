import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { app } from 'electron';
import { join } from 'node:path';
import type { LocalGitStatus } from './local-git';

export interface StoredProject {
  id: string;
  name: string;
  rootPath: string;
  isGitRepo: boolean;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  changes: string[];
  addedAt: string;
}

interface Store {
  projects: StoredProject[];
}

const EMPTY: Store = { projects: [] };

function storePath(): string {
  return join(app.getPath('userData'), 'projects.json');
}

function idFor(rootPath: string): string {
  const base64 = Buffer.from(rootPath).toString('base64url');
  return base64.slice(0, 40);
}

export async function listProjects(): Promise<StoredProject[]> {
  try {
    const raw = await readFile(storePath(), 'utf8');
    const store = JSON.parse(raw) as Store;
    return Array.isArray(store.projects) ? store.projects : [];
  } catch {
    return [];
  }
}

export async function saveProject(status: LocalGitStatus): Promise<StoredProject> {
  const projects = await listProjects();
  const existing = projects.find((project) => project.rootPath === status.rootPath);
  const entry: StoredProject = {
    id: existing?.id ?? idFor(status.rootPath),
    name: existing?.name ?? status.rootPath.split(/[\\/]/).pop() ?? 'Project',
    rootPath: status.rootPath,
    isGitRepo: status.isGitRepo,
    branch: status.branch,
    headSha: status.headSha,
    remoteUrl: status.remoteUrl,
    ahead: status.ahead,
    behind: status.behind,
    changes: status.changes,
    addedAt: existing?.addedAt ?? new Date().toISOString(),
  };
  const next = existing ? projects.map((project) => (project.id === entry.id ? entry : project)) : [entry, ...projects];
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(storePath(), JSON.stringify({ projects: next }, null, 2), 'utf8');
  return entry;
}

export async function removeProject(id: string): Promise<boolean> {
  const projects = await listProjects();
  const next = projects.filter((project) => project.id !== id);
  await writeFile(storePath(), JSON.stringify({ projects: next }, null, 2), 'utf8');
  return next.length !== projects.length;
}

export { EMPTY as emptyStore };
