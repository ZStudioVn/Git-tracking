import { describe, expect, it } from 'vitest';
import { rateLimit, resetRateLimits } from '@/lib/security/rate-limit';

describe('rateLimit', () => {
  it('blocks requests after the configured window quota', () => {
    resetRateLimits();
    expect(rateLimit('test', 2, 1000, 10).allowed).toBe(true);
    expect(rateLimit('test', 2, 1000, 10).allowed).toBe(true);
    expect(rateLimit('test', 2, 1000, 10).allowed).toBe(false);
    expect(rateLimit('test', 2, 1000, 1010).allowed).toBe(true);
  });
});
