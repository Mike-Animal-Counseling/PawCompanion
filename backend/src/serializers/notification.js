import { toId } from '../lib/ids.js';

export function serializeNotification(notification) {
  return {
    id: toId(notification),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: Boolean(notification.readAt),
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
