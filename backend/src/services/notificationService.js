import Notification from '../models/Notification.js';
import { logger } from '../lib/logger.js';

/**
 * In-app notification delivery. Notifications are persisted and surfaced in
 * the web app; outbound email/SMS can be layered on later without changing
 * domain call sites.
 */
export async function notify({ recipientId, recipientRole, type, title, body = '', link = '', data = {} }) {
  if (!recipientId) return null;
  try {
    return await Notification.create({
      recipientId,
      recipientRole,
      type,
      title,
      body,
      link,
      data,
    });
  } catch (error) {
    // Notifications are best-effort and must never fail the business action.
    logger.warn('notification.create_failed', { type, error: error.message });
    return null;
  }
}

export async function notifyMany(recipients, payload) {
  return Promise.all(recipients.map((recipient) => notify({ ...recipient, ...payload })));
}

export async function unreadCount(recipientId, recipientRole) {
  return Notification.countDocuments({ recipientId, recipientRole, readAt: null });
}

export async function markRead(recipientId, recipientRole, notificationId) {
  const result = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId, recipientRole },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  return result;
}

export async function markAllRead(recipientId, recipientRole) {
  const result = await Notification.updateMany(
    { recipientId, recipientRole, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount;
}
