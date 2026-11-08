import { randomBytes } from 'node:crypto';
import Payment from '../models/Payment.js';
import { conflict } from '../lib/errors.js';

/**
 * Sandbox payment provider.
 *
 * This build intentionally ships without a live card processor. It creates a
 * real, auditable payment record so booking, refund, receipt and reporting
 * flows behave exactly like they will with a live provider. Swapping in Stripe
 * later means implementing `charge` and `refund` here, not rewriting bookings.
 */
function receiptNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `PC-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function charge({ bookingId, customerId, merchantId, amount, metadata = {} }) {
  if (!Number.isFinite(amount) || amount <= 0) throw conflict('This booking has no payable amount');
  return Payment.create({
    bookingId,
    customerId,
    merchantId,
    provider: 'sandbox',
    providerRef: `sbx_${randomBytes(12).toString('hex')}`,
    amount: Math.round(amount * 100) / 100,
    currency: 'USD',
    method: 'sandbox_card',
    status: 'succeeded',
    receiptNumber: receiptNumber(),
    metadata,
  });
}

export async function refund(paymentId, { reason = 'cancelled' } = {}) {
  const payment = await Payment.findById(paymentId);
  if (!payment) return null;
  if (payment.status === 'refunded') return payment;
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  payment.refundRef = `rfnd_${randomBytes(8).toString('hex')}`;
  payment.metadata = { ...(payment.metadata || {}), refundReason: reason };
  await payment.save();
  return payment;
}

export function isSandbox() {
  return true;
}
