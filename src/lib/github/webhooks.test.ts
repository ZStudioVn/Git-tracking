import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { isValidWebhookDeliveryId, verifyWebhookSignature } from '@/lib/github/webhooks';

describe('GitHub webhook security', () => {
  const body = Buffer.from('{"action":"push"}');
  const secret = 'test-secret';
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('verifies an exact HMAC signature', () => {
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(body, `${signature}x`, secret)).toBe(false);
  });

  it('validates delivery IDs', () => {
    expect(isValidWebhookDeliveryId('delivery-123')).toBe(true);
    expect(isValidWebhookDeliveryId('../bad')).toBe(false);
    expect(isValidWebhookDeliveryId(null)).toBe(false);
  });
});
