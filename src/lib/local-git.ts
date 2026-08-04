import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, realpath, readFile } from 'node:fs/promises';
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

async function git(rootPath: string, args: string[]): Promise<string> {
  const result = await execFileAsync('git', ['-C', rootPath, ...args], { timeout: 10_000, maxBuffer: 1_000_000 });
  return result.stdout.trim();
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
