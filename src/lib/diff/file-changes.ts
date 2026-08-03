/**
 * Changed file enumeration. (3A-02)
 * Stores file list + stats only — no full patch content. (D-04)
 * Handles renamed, deleted, binary, and large files safely. (3A-05)
 */
import type { Octokit } from '@octokit/rest';
import type { FileChange } from '@/types/diff';
import { AppError, createAppError } from '@/lib/errors';

const MAX_DIFF_FILES = 300;

export async function getFileChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<FileChange[]> {
  const { data } = await octokit.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${base}...${head}`,
  });

  if (!data.files) return [];

  if (data.files.length > MAX_DIFF_FILES) {
    throw createAppError(
      AppError.DIFF_TOO_LARGE,
      `Comparison contains ${data.files.length} files (limit: ${MAX_DIFF_FILES})`,
    );
  }

  return data.files.map((f) => ({
    path: f.filename,
    oldPath: f.previous_filename ?? null,
    status: mapStatus(f.status),
    additions: f.additions,
    deletions: f.deletions,
    binary: isBinary(f),
    oversized: f.changes > 10000,
  }));
}

function mapStatus(status: string): FileChange['status'] {
  const map: Record<string, FileChange['status']> = {
    added: 'ADDED',
    modified: 'MODIFIED',
    removed: 'DELETED',
    renamed: 'RENAMED',
    copied: 'COPIED',
    unchanged: 'UNCHANGED',
  };
  return map[status] ?? 'MODIFIED';
}

function isBinary(file: { patch?: string; additions: number; deletions: number }): boolean {
  // GitHub omits the patch field for binary files
  return file.patch === undefined && (file.additions === 0 && file.deletions === 0);
}
