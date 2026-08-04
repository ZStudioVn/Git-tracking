import { describe, expect, it } from 'vitest';
import { redactLogContext } from '@/lib/system-log';

describe('system log redaction', () => {
  it('redacts secrets and bounds error details', () => {
    const result = redactLogContext({ token: 'secret', nested: { authorization: 'bearer secret' }, error: new Error('x'.repeat(3_000)) });
    expect(result).toMatchObject({ token: '[REDACTED]', nested: { authorization: '[REDACTED]' } });
    expect(JSON.stringify(result)).toContain('[REDACTED]');
    expect(JSON.stringify(result).length).toBeLessThan(20_000);
  });
});
