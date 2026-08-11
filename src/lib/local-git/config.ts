/**
 * Read/write local git config (user.name, user.email).
 */
import { git } from './exec';
import type { LocalGitConfig } from './types';

export async function readLocalGitConfig(rootPath: string): Promise<LocalGitConfig> {
  const [name, email] = await Promise.all([
    git(rootPath, ['config', 'user.name']).catch(() => ''),
    git(rootPath, ['config', 'user.email']).catch(() => ''),
  ]);
  return { authorName: name || null, authorEmail: email || null };
}

export async function writeLocalGitConfig(
  rootPath: string,
  scope: 'global' | 'local',
  name: string,
  email: string,
): Promise<void> {
  const args = ['config'];
  if (scope === 'global') args.push('--global');
  await git(rootPath, [...args, 'user.name', name]);
  await git(rootPath, [...args, 'user.email', email]);
}
