import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export type SystemLogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogInput {
  level: SystemLogLevel;
  category: string;
  message: string;
  userId?: string;
  repositoryId?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

export async function recordSystemLog(input: LogInput): Promise<void> {
  try {
    await db.systemLog.create({
      data: {
        level: input.level,
        category: input.category.slice(0, 80),
        message: input.message.slice(0, 4_000),
        userId: input.userId,
        repositoryId: input.repositoryId,
        requestId: input.requestId,
        context: input.context ? redactContext(input.context) : undefined,
      },
    });
  } catch (error) {
    logger.error({ error, category: input.category }, 'Failed to persist system log');
  }
}

export function redactLogContext(value: Record<string, unknown>): Prisma.InputJsonValue {
  return redactContext(value);
}

function redactContext(value: Record<string, unknown>): Prisma.InputJsonValue {
  return redactValue(value) as Prisma.InputJsonValue;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 100).map(redactValue);
  if (value instanceof Error) return { name: value.name.slice(0, 200), message: value.message.slice(0, 2_000), stack: value.stack?.slice(0, 4_000) };
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, child]) => {
      if (/token|secret|authorization|cookie|password|access_key/i.test(key)) return [key, '[REDACTED]'];
      return [key, redactValue(child)];
    }));
  }
  if (typeof value === 'string') return value.length > 2_000 ? `${value.slice(0, 2_000)}…` : value;
  if (typeof value === 'bigint') return value.toString();
  return value;
}
