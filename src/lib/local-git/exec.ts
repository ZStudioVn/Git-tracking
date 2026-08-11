/**
 * Low-level git command execution.
 * All git commands go through this module for consistency and safety.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Execute a git command safely using execFile (no shell interpolation).
 * Uses `git -C <rootPath>` to run in the specified repo.
 */
export async function git(rootPath: string, args: string[], timeout = 15_000): Promise<string> {
  const result = await execFileAsync('git', ['-C', rootPath, ...args], { timeout, maxBuffer: 2_000_000 });
  return result.stdout.trim();
}

/**
 * Safe git execution that returns empty string on failure instead of throwing.
 */
export async function gitSafe(rootPath: string, args: string[]): Promise<string> {
  try {
    return await git(rootPath, args);
  } catch {
    return '';
  }
}

/**
 * Validate that paths are safe (no traversal, no null bytes, reasonable length).
 */
export function assertSafeRelativePaths(paths: string[]): void {
  for (const entry of paths) {
    if (typeof entry !== 'string' || entry.length === 0 || entry.length > 2000 || entry.includes('\0')) {
      throw new Error('Invalid path');
    }
    if (entry.startsWith('/') || entry.includes('\\\\')) throw new Error('Invalid path: must be repo-relative');
    if (entry.split('/').some((segment) => segment === '..' || segment === '.')) {
      throw new Error('Invalid path: traversal is not allowed');
    }
  }
}
