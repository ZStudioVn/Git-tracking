/**
 * Error taxonomy for Git-Tracking application.
 * All errors should map to one of these codes. (SETUP.md §4)
 */

export enum AppErrorCode {
  // Auth
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',

  // GitHub API
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  GITHUB_RATE_LIMITED = 'GITHUB_RATE_LIMITED',
  GITHUB_NOT_FOUND = 'GITHUB_NOT_FOUND',
  GITHUB_PERMISSION_DENIED = 'GITHUB_PERMISSION_DENIED',

  // Sync
  SYNC_ALREADY_RUNNING = 'SYNC_ALREADY_RUNNING',
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_STALE = 'SYNC_STALE',

  // Diff
  DIFF_TOO_LARGE = 'DIFF_TOO_LARGE',
  DIFF_BINARY_FILE = 'DIFF_BINARY_FILE',
  DIFF_REVISION_NOT_FOUND = 'DIFF_REVISION_NOT_FOUND',

  // Repository
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  REPO_ALREADY_CONNECTED = 'REPO_ALREADY_CONNECTED',

  // Generic
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;
  readonly context?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    message: string,
    statusCode = 500,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

// ─── Utility constructors ────────────────────────────────────────────────────

export function notFound(resource: string, id?: string): AppError {
  return new AppError(
    AppErrorCode.NOT_FOUND,
    id ? `${resource} not found: ${id}` : `${resource} not found`,
    404,
  );
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(AppErrorCode.UNAUTHORIZED, message, 403);
}

export function unauthenticated(message = 'Not authenticated'): AppError {
  return new AppError(AppErrorCode.UNAUTHENTICATED, message, 401);
}

export function rateLimited(resetAt?: Date): AppError {
  return new AppError(
    AppErrorCode.GITHUB_RATE_LIMITED,
    'GitHub API rate limit exceeded',
    429,
    resetAt ? { resetAt: resetAt.toISOString() } : undefined,
  );
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
