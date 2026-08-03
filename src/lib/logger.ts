/**
 * Structured logger using pino. (SETUP.md §6)
 * Use logger.child({ syncJobId, repoId }) to attach sync context.
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard' },
    },
  }),
});

/** Create a child logger with sync context attached to every log line. */
export function syncLogger(context: {
  repoId?: string;
  syncJobId?: string;
  branch?: string;
}) {
  return logger.child({ ...context, module: 'sync' });
}
