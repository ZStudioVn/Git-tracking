/**
 * Lazy tree loading. (2B-02)
 * Loads tree nodes on demand per folder — avoids loading entire repo tree at once.
 * Folders are loaded when expanded (load on demand per spec).
 */
import type { Octokit } from '@octokit/rest';
import type { TreeNode } from '@/types/github';
import { logger } from '@/lib/logger';

export async function loadTreeFolder(
  octokit: Octokit,
  owner: string,
  repo: string,
  treeSha: string,
): Promise<TreeNode[]> {
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: '0', // one level at a time
  });

  if (data.truncated) {
    logger.warn({ treeSha }, 'Tree response was truncated by GitHub — folder is too large');
  }

  return (data.tree ?? []).map((item) => ({
    sha: item.sha ?? '',
    path: item.path ?? '',
    name: (item.path ?? '').split('/').pop() ?? '',
    type: item.type === 'tree' ? 'tree' : 'blob',
    size: item.size,
    mode: item.mode ?? '',
  }));
}
