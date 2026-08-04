/**
 * Shared GitHub-related TypeScript types.
 * Used across lib/github adapters and API routes.
 */

export interface TreeNode {
  sha: string;
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  mode: string;
  name?: string;
}

export interface GitBranch {
  name: string;
  headSha: string;
  isDefault: boolean;
  aheadBy?: number;
  behindBy?: number;
}

export interface GitCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authoredAt: string;
  committedAt: string;
  parentShas: string[];
  url?: string;
}

export interface GitTag {
  name: string;
  commitSha: string;
}

export interface GitPullRequest {
  githubId: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  headSha?: string;
  baseBranch: string;
  headBranch: string;
  authorLogin?: string;
  url?: string;
  mergedAt?: string;
  closedAt?: string;
}

export interface RepoMeta {
  githubId: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  description?: string;
  defaultBranch: string;
  cloneUrl?: string;
}
