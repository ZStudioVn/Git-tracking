const REVISION_PATTERN = /^[A-Za-z0-9._/@-]{1,100}$/;

export function isSafeRepositoryPath(path: string): boolean {
  return path.length > 0 && path.length <= 500 && !path.startsWith('/') && !path.includes('..') && !/[\u0000-\u001f]/.test(path);
}

export function isSafeRevision(revision: string): boolean {
  return REVISION_PATTERN.test(revision);
}
