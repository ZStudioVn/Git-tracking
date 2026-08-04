/**
 * Authenticated Octokit instance factory.
 * Decrypts the stored token before creating the client.
 * D-03: OAuth App token for MVP.
 */
import { Octokit } from '@octokit/rest';
import { decryptToken } from '@/lib/utils/crypto';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

export function createOctokit(encryptedToken: string): Octokit {
  const token = decryptToken(encryptedToken);
  return new Octokit({
    auth: token,
    log: {
      debug: (msg) => logger.debug(msg),
      info: (msg) => logger.info(msg),
      warn: (msg) => logger.warn(msg),
      error: (msg) => logger.error(msg),
    },
  });
}

export async function createOctokitForUser(userId: string): Promise<Octokit> {
  const account = await db.account.findFirst({
    where: { userId, provider: 'github' },
    select: { access_token: true, expires_at: true },
  });
  if (!account?.access_token) throw new Error('GitHub account is not connected');
  if (account.expires_at && account.expires_at * 1000 <= Date.now()) {
    throw new Error('GitHub token expired; please sign in again');
  }
  return createOctokit(account.access_token);
}
