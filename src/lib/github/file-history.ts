import type { Octokit } from '@octokit/rest';

export interface FileHistoryEntry {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  url: string;
}

export async function fetchFileHistory(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  revision?: string,
): Promise<FileHistoryEntry[]> {
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    path,
    sha: revision,
    per_page: 50,
  });
  return data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    authorName: commit.commit.author?.name ?? commit.author?.login ?? 'Unknown',
    committedAt: commit.commit.committer?.date ?? new Date().toISOString(),
    url: commit.html_url,
  }));
}