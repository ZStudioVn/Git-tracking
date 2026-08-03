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
