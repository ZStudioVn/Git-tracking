/**
 * Pull request metadata fetching via GitHub API.
 * Stores metadata only — no full diff (D-04).
 */
import type { Octokit } from '@octokit/rest';

export type GitHubPRState = 'open' | 'closed';

export interface GitHubPullRequest {
  githubId: number;
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  headSha: string | null;
  baseBranch: string;
  headBranch: string;
  authorLogin: string | null;
  url: string;
  mergedAt: Date | null;
  closedAt: Date | null;
}

export async function fetchPullRequests(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all',
): Promise<GitHubPullRequest[]> {
  const prs: GitHubPullRequest[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const pr of data) {
      let prState: 'OPEN' | 'CLOSED' | 'MERGED' = 'OPEN';
      if (pr.merged_at) prState = 'MERGED';
      else if (pr.state === 'closed') prState = 'CLOSED';

      prs.push({
        githubId: pr.id,
        number: pr.number,
        title: pr.title,
        state: prState,
        headSha: pr.head.sha ?? null,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        authorLogin: pr.user?.login ?? null,
        url: pr.html_url,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return prs;
}
