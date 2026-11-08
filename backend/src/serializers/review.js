import { toId } from '../lib/ids.js';

function maskedName(name = '') {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)[0]}.`;
}

export function serializeReview(review) {
  const customer = review.customerId && review.customerId.name ? review.customerId : null;
  return {
    id: toId(review),
    rating: review.rating,
    title: review.title || '',
    body: review.body || '',
    status: review.status,
    author: {
      name: customer ? maskedName(customer.name) : 'Verified guest',
      avatarColor: customer?.avatarColor || '#2f6b52',
    },
    merchantReply: review.merchantReply?.at
      ? { body: review.merchantReply.body, at: review.merchantReply.at }
      : null,
    helpfulCount: review.helpfulCount || 0,
    createdAt: review.createdAt,
  };
}
