import { readLocalGitConfig, writeLocalGitConfig } from './local-git';

export interface GitIdentity {
  authorName: string | null;
  authorEmail: string | null;
}

export async function readGitConfig(rootPath: string): Promise<GitIdentity> {
  return readLocalGitConfig(rootPath);
}

export async function writeGitConfig(
  rootPath: string,
  scope: 'global' | 'local',
  name: string,
  email: string,
): Promise<void> {
  await writeLocalGitConfig(rootPath, scope, name, email);
}
