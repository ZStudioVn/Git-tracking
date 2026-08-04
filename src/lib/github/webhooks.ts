/**
 * GitHub webhook signature verification. (Phase 4)
 * HMAC-SHA256 verification per GitHub docs.
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
  if (!secret || !/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = `sha256=${createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;
  try {
    const actualBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function isValidWebhookDeliveryId(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9._:-]{1,200}$/.test(value));
}
