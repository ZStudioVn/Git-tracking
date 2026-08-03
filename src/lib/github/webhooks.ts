/**
 * GitHub webhook signature verification. (Phase 4)
 * HMAC-SHA256 verification per GitHub docs.
 * Placeholder until Phase 4 implementation.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies the X-Hub-Signature-256 header from GitHub.
 * Returns true if signature is valid.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = `sha256=${createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
