import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, realpath, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export interface LocalGitStatus {
  rootPath: string;
  isGitRepo: boolean;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  changes: string[];
}

export interface DiffFile {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  staged: boolean;
  untracked: boolean;
  conflict: boolean;
  diff: string | null;
}

export interface ProjectDiff {
  rootPath: string;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  files: DiffFile[];
}

export interface LogEntry {
  sha: string;
  message: string;
  authorName: string;
  authoredAt: string;
  parents: string[];
}

export interface TreeEntry {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  status: string;
  lastCommit: { sha: string; message: string; timestamp: string } | null;
}

export interface ProjectTree {
  rootPath: string;
  dirPath: string;
  entries: TreeEntry[];
}

function displayStatus(parsed: { indexStatus: string; workTreeStatus: string; untracked: boolean; conflict: boolean; staged: boolean }): string {
  if (parsed.conflict) return 'U';
  if (parsed.untracked) return '??';
  if (parsed.staged && parsed.workTreeStatus === ' ') return parsed.indexStatus;
  if (parsed.workTreeStatus !== ' ') return parsed.workTreeStatus;
  return parsed.indexStatus;
}

async function lastCommitFor(rootPath: string, relPath: string): Promise<TreeEntry['lastCommit']> {
  const out = await gitSafe(rootPath, ['log', '-1', '--format=%h%x00%at%x00%s', '--', relPath]);
  if (!out) return null;
  const [sha, timestamp, ...messageParts] = out.split('\0');
  return { sha, message: messageParts.join('\0'), timestamp: new Date(Number(timestamp) * 1000).toISOString() };
}

export async function getProjectTree(rootPath: string, dirPath = ''): Promise<ProjectTree> {
  const resolved = await realpath(path.resolve(rootPath));
  const dir = dirPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const porcelain = await gitSafe(resolved, ['status', '--porcelain=v1']);
  const statusMap = new Map<string, { indexStatus: string; workTreeStatus: string; untracked: boolean; conflict: boolean; staged: boolean }>();
  for (const line of porcelain.split('\n')) {
    if (!line.trim()) continue;
    const parsed = parsePorcelain(line);
    if (parsed) statusMap.set(parsed.path, parsed);
  }

  const dirAbsolute = dir ? path.join(resolved, ...dir.split('/')) : resolved;
  const dirents = await readdir(dirAbsolute, { withFileTypes: true });

  const entries = await Promise.all(
    dirents
      .filter((entry) => entry.name !== '.git')
      .map(async (entry) => {
        const relPath = dir ? `${dir}/${entry.name}` : entry.name;
        const type: 'tree' | 'blob' = entry.isDirectory() ? 'tree' : 'blob';
        let status = 'clean';
        if (type === 'blob') {
          const parsed = statusMap.get(relPath);
          status = parsed ? displayStatus(parsed) : 'clean';
        } else {
          const childChanges = [...statusMap.entries()].filter(([childPath]) => childPath.startsWith(`${relPath}/`));
          if (childChanges.some(([, parsed]) => parsed.conflict)) status = 'U';
          else if (childChanges.some(([, parsed]) => !parsed.untracked)) status = 'M';
          else if (childChanges.some(([, parsed]) => parsed.untracked)) status = '??';
        }
        const lastCommit = await lastCommitFor(resolved, relPath);
        return { name: entry.name, path: relPath, type, status, lastCommit };
      }),
  );

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { rootPath: resolved, dirPath: dir, entries };
}

export interface LocalGitConfig {
  authorName: string | null;
  authorEmail: string | null;
}

const CONFLICT_MARKERS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);

function parsePorcelain(line: string): Pick<DiffFile, 'path' | 'indexStatus' | 'workTreeStatus' | 'staged' | 'untracked' | 'conflict'> | null {
  if (line.length < 4) return null;
  const indexStatus = line[0];
  const workTreeStatus = line[1];
  let raw = line.slice(3);
  const renameArrow = raw.indexOf(' -> ');
  if (renameArrow !== -1) raw = raw.slice(renameArrow + 4);
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
  const filePath = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const untracked = indexStatus === '?' && workTreeStatus === '?';
  return {
    path: filePath,
    indexStatus,
    workTreeStatus,
    staged: indexStatus !== ' ' && indexStatus !== '?',
    untracked,
    conflict: CONFLICT_MARKERS.has(`${indexStatus}${workTreeStatus}`),
  };
}

async function git(rootPath: string, args: string[], timeout = 15_000): Promise<string> {
  const result = await execFileAsync('git', ['-C', rootPath, ...args], { timeout, maxBuffer: 2_000_000 });
  return result.stdout.trim();
}

function assertSafeRelativePaths(paths: string[]): void {
  for (const entry of paths) {
    if (typeof entry !== 'string' || entry.length === 0 || entry.length > 2000 || entry.includes('\0')) {
      throw new Error('Invalid path');
    }
    if (entry.startsWith('/') || entry.includes('\\')) throw new Error('Invalid path: must be repo-relative');
    if (entry.split('/').some((segment) => segment === '..' || segment === '.')) {
      throw new Error('Invalid path: traversal is not allowed');
    }
  }
}

export interface CommitResult {
  sha: string;
}

export async function stageFiles(rootPath: string, paths: string[]): Promise<void> {
  const resolved = await realpath(path.resolve(rootPath));
  if (paths.length === 0) {
    await git(resolved, ['add', '-A']);
    return;
  }
  assertSafeRelativePaths(paths);
  await git(resolved, ['add', '--', ...paths]);
}

export async function unstageFiles(rootPath: string, paths: string[]): Promise<void> {
  const resolved = await realpath(path.resolve(rootPath));
  if (paths.length === 0) {
    await git(resolved, ['reset']);
    return;
  }
  assertSafeRelativePaths(paths);
  await git(resolved, ['reset', '--', ...paths]);
}

export async function commitChanges(
  rootPath: string,
  message: string,
  author?: { name: string; email: string },
): Promise<CommitResult> {
  const resolved = await realpath(path.resolve(rootPath));
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > 1000) throw new Error('Invalid commit message');
  const configArgs =
    author?.name && author?.email ? ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`] : [];
  await git(resolved, [...configArgs, 'commit', '-m', trimmed], 60_000);
  const sha = await git(resolved, ['rev-parse', 'HEAD']);
  return { sha };
}

export async function pushProject(rootPath: string): Promise<void> {
  const resolved = await realpath(path.resolve(rootPath));
  const branch = await git(resolved, ['branch', '--show-current']);
  if (!branch) throw new Error('Not on a branch — cannot push');
  await git(resolved, ['push', '-u', 'origin', branch], 120_000);
}

async function gitSafe(rootPath: string, args: string[]): Promise<string> {
  try {
    return await git(rootPath, args);
  } catch {
    return '';
  }
}

export async function inspectLocalGit(rootPath: string): Promise<LocalGitStatus> {
  const resolved = await realpath(path.resolve(rootPath));
  await access(resolved);
  try {
    const [branch, headSha, remoteUrl, porcelain, upstreamCount] = await Promise.all([
      git(resolved, ['branch', '--show-current']),
      git(resolved, ['rev-parse', 'HEAD']),
      git(resolved, ['remote', 'get-url', 'origin']).catch(() => ''),
      git(resolved, ['status', '--porcelain=v1']),
      git(resolved, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']).catch(() => ''),
    ]);
    let ahead: number | null = null;
    let behind: number | null = null;
    if (upstreamCount) {
      const [left, right] = upstreamCount.split(/\s+/);
      behind = Number.parseInt(left, 10) || 0;
      ahead = Number.parseInt(right, 10) || 0;
    }
    return { rootPath: resolved, isGitRepo: true, branch: branch || null, headSha: headSha || null, remoteUrl: remoteUrl || null, ahead, behind, changes: porcelain ? porcelain.split('\n') : [] };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 128) return { rootPath: resolved, isGitRepo: false, branch: null, headSha: null, remoteUrl: null, ahead: null, behind: null, changes: [] };
    throw error;
  }
}

export async function readLocalGitConfig(rootPath: string): Promise<LocalGitConfig> {
  const [name, email] = await Promise.all([
    git(rootPath, ['config', 'user.name']).catch(() => ''),
    git(rootPath, ['config', 'user.email']).catch(() => ''),
  ]);
  return { authorName: name || null, authorEmail: email || null };
}

export async function writeLocalGitConfig(rootPath: string, scope: 'global' | 'local', name: string, email: string): Promise<void> {
  const args = ['config'];
  if (scope === 'global') args.push('--global');
  await git(rootPath, [...args, 'user.name', name]);
  await git(rootPath, [...args, 'user.email', email]);
}

export async function getProjectDiff(rootPath: string): Promise<ProjectDiff> {
  const resolved = await realpath(path.resolve(rootPath));
  const status = await inspectLocalGit(resolved);
  if (!status.isGitRepo) return { rootPath: resolved, branch: null, headSha: null, remoteUrl: null, ahead: null, behind: null, files: [] };
  const files: DiffFile[] = [];
  for (const line of status.changes) {
    if (!line.trim()) continue;
    const parsed = parsePorcelain(line);
    if (!parsed) continue;
    let diff: string | null = null;
    if (parsed.conflict) {
      diff = (await gitSafe(resolved, ['diff', '--', parsed.path])) || null;
    } else if (parsed.untracked) {
      const content = await readFile(path.join(resolved, parsed.path), 'utf8').catch(() => '');
      diff = content ? content.split('\n').map((contentLine) => `+${contentLine}`).join('\n') : null;
    } else {
      const parts: string[] = [];
      if (parsed.staged) parts.push(await gitSafe(resolved, ['diff', '--cached', '--', parsed.path]));
      if (!parsed.staged || parsed.workTreeStatus !== ' ') parts.push(await gitSafe(resolved, ['diff', '--', parsed.path]));
      diff = parts.filter(Boolean).join('\n') || null;
    }
    files.push({ ...parsed, diff });
  }
  return { rootPath: resolved, branch: status.branch, headSha: status.headSha, remoteUrl: status.remoteUrl, ahead: status.ahead, behind: status.behind, files };
}

export async function getProjectLog(rootPath: string, limit = 100): Promise<LogEntry[]> {
  const resolved = await realpath(path.resolve(rootPath));
  const out = await git(resolved, ['log', '--all', `--max-count=${limit}`, '--format=%H%x00%P%x00%an%x00%at%x00%s']);
  if (!out) return [];
  return out.split('\n').filter(Boolean).map((line) => {
    const [sha, parents, authorName, timestamp, ...messageParts] = line.split('\0');
    return {
      sha,
      message: messageParts.join('\0'),
      authorName,
      authoredAt: new Date(Number(timestamp) * 1000).toISOString(),
      parents: parents ? parents.split(' ') : [],
    };
  });
}

export { git as runGit };
