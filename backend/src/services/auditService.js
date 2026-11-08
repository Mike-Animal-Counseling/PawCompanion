import { createHash } from 'node:crypto';
import AuditEvent from '../models/AuditEvent.js';
import { logger } from '../lib/logger.js';

function hashIp(ip = '') {
  return createHash('sha256').update(String(ip)).digest('hex');
}

/**
 * Append-only operational trail for sensitive actions (moderation, refunds,
 * booking decisions, account changes). Never store message content here.
 */
export async function recordAudit(req, { action, targetType = '', targetId = '', metadata = {}, actorRole, actorId }) {
  try {
    await AuditEvent.create({
      actorId: actorId || req?.auth?.sub || '',
      actorRole: actorRole || req?.auth?.role || 'system',
      action,
      targetType,
      targetId: String(targetId || ''),
      metadata,
      ipHash: hashIp(req?.ip),
    });
  } catch (error) {
    logger.warn('audit.write_failed', { action, error: error.message });
  }
}
