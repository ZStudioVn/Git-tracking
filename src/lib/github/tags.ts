import type { Octokit } from '@octokit/rest';

export interface GitHubTag {
  name: string;
  commitSha: string;
}

export async function fetchTags(octokit: Octokit, owner: string, repo: string): Promise<GitHubTag[]> {
  const tags: GitHubTag[] = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.repos.listTags({ owner, repo, per_page: 100, page });
    tags.push(...data.map((tag) => ({ name: tag.name, commitSha: tag.commit.sha })));
    if (data.length < 100) return tags;
    page += 1;
  }
}