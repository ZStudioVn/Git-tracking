import { describe, expect, it } from 'vitest';
import { isSafeRepositoryPath, isSafeRevision } from '@/lib/validation/git-input';

describe('Git input validation', () => {
  it('accepts normal repository paths and revisions', () => {
    expect(isSafeRepositoryPath('src/app/page.tsx')).toBe(true);
    expect(isSafeRevision('refs/heads/main')).toBe(true);
  });

  it('rejects traversal, control characters, and unbounded revisions', () => {
    expect(isSafeRepositoryPath('../.env')).toBe(false);
    expect(isSafeRepositoryPath('src/\u0000file')).toBe(false);
    expect(isSafeRevision('a'.repeat(101))).toBe(false);
  });
});
