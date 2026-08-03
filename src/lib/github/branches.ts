/**
 * Branch operations via GitHub API.
 */
import type { Octokit } from '@octokit/rest';

export interface GitHubBranch {
  name: string;
  headSha: string;
  isDefault: boolean;
}

export async function fetchBranches(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<GitHubBranch[]> {
  const branches: GitHubBranch[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const b of data) {
      branches.push({
        name: b.name,
        headSha: b.commit.sha,
        isDefault: b.name === defaultBranch,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return branches;
}
