export interface GitTrackingBridgeProject {
  id: string;
  name: string;
  rootPath: string;
  isGitRepo: boolean;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  changes: string[];
  addedAt: string;
}

export interface DiffFile {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  staged: boolean;
  untracked: boolean;
  conflict: boolean;
  diff: string | null;
}

export interface ProjectDiff {
  rootPath: string;
  branch: string | null;
  headSha: string | null;
  remoteUrl: string | null;
  ahead: number | null;
  behind: number | null;
  files: DiffFile[];
}

export interface GitRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface GitTrackingBridge {
  projects: {
    list: () => Promise<GitTrackingBridgeProject[]>;
    pick: () => Promise<string | null>;
    add: (rootPath: string) => Promise<GitTrackingBridgeProject>;
    refresh: (id: string) => Promise<{ project: GitTrackingBridgeProject; status: unknown }>;
    diff: (id: string) => Promise<ProjectDiff>;
    remove: (id: string) => Promise<boolean>;
    openFolder: (rootPath: string) => Promise<void>;
  };
  git: {
    inspect: (rootPath: string) => Promise<unknown>;
    run: (rootPath: string, args: string[]) => Promise<GitRunResult>;
  };
  gitConfig: {
    read: (rootPath: string) => Promise<{ authorName: string | null; authorEmail: string | null }>;
    write: (rootPath: string, scope: 'global' | 'local', name: string, email: string) => Promise<void>;
  };
}
