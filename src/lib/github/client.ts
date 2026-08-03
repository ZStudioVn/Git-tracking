/**
 * Authenticated Octokit instance factory.
 * Decrypts the stored token before creating the client.
 * D-03: OAuth App token for MVP.
 */
import { Octokit } from '@octokit/rest';
import { decryptToken } from '@/lib/utils/crypto';
import { logger } from '@/lib/logger';

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
