/**
 * Parse git status --porcelain=v1 output into structured data.
 */
import type { DiffFile } from './types';

const CONFLICT_MARKERS = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU']);

export function parsePorcelain(
  line: string
): Pick<DiffFile, 'path' | 'indexStatus' | 'workTreeStatus' | 'staged' | 'untracked' | 'conflict'> | null {
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

export function displayStatus(parsed: {
  indexStatus: string;
  workTreeStatus: string;
  untracked: boolean;
  conflict: boolean;
  staged: boolean;
}): string {
  if (parsed.conflict) return 'U';
  if (parsed.untracked) return '??';
  if (parsed.staged && parsed.workTreeStatus === ' ') return parsed.indexStatus;
  if (parsed.workTreeStatus !== ' ') return parsed.workTreeStatus;
  return parsed.indexStatus;
}
