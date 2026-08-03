/**
 * Repository metadata operations via GitHub API.
 */
import type { Octokit } from '@octokit/rest';

export interface GitHubRepoMeta {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  defaultBranch: string;
  cloneUrl: string;
}

export async function fetchRepoMeta(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GitHubRepoMeta> {
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    id: data.id,
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    private: data.private,
    description: data.description ?? null,
    defaultBranch: data.default_branch,
    cloneUrl: data.clone_url,
  };
}
