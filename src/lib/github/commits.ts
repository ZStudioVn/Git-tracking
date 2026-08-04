/**
 * Commit fetching with cursor-based pagination. (D-05)
 * Uses `since` param (ISO date) as cursor to avoid re-fetching old commits.
 */
import type { Octokit } from '@octokit/rest';

export interface GitHubCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: Date;
  committedAt: Date;
  url: string;
  parents: string[]; // parent SHAs
}

export async function fetchCommitsSince(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  since?: Date,
): Promise<GitHubCommit[]> {
  const commits: GitHubCommit[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      since: since?.toISOString(),
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const c of data) {
      commits.push({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? 'Unknown',
        authorEmail: c.commit.author?.email ?? '',
        authoredAt: new Date(c.commit.author?.date ?? c.commit.committer?.date ?? Date.now()),
        committedAt: new Date(c.commit.committer?.date ?? Date.now()),
        url: c.html_url,
        parents: c.parents.map((p) => p.sha),
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return commits;
}

export async function fetchCommitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<Array<{ path: string; oldPath: string | null; status: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED' | 'UNCHANGED'; additions: number; deletions: number; binary: boolean }>> {
  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });
  return (data.files ?? []).map((file) => ({
    path: file.filename,
    oldPath: file.previous_filename ?? null,
    status: ({ added: 'ADDED', modified: 'MODIFIED', removed: 'DELETED', renamed: 'RENAMED', copied: 'COPIED' } as Record<string, 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED' | 'COPIED'>)[file.status] ?? 'MODIFIED',
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    binary: file.patch === undefined && (file.additions ?? 0) === 0 && (file.deletions ?? 0) === 0,
  }));
}
