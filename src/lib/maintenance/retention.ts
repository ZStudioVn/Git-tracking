import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const DEFAULT_RETENTION_DAYS = 90;

export async function purgeExpiredOperationalData(retentionDays = DEFAULT_RETENTION_DAYS): Promise<{ logs: number; deliveries: number }> {
  const days = Math.min(Math.max(Math.floor(retentionDays), 30), 365);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [logs, deliveries] = await Promise.all([
    db.systemLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    db.webhookDelivery.deleteMany({ where: { receivedAt: { lt: cutoff } } }),
  ]);
  logger.info({ cutoff, logs: logs.count, deliveries: deliveries.count }, 'Operational data retention completed');
  return { logs: logs.count, deliveries: deliveries.count };
}
