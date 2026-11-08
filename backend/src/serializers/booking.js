import { toId } from '../lib/ids.js';
import { dateTimeFrom } from '../lib/time.js';

function customerSummary(customer) {
  if (!customer) return null;
  return {
    id: toId(customer),
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    city: customer.city || '',
  };
}

export function serializeBooking(booking, { viewer = 'customer' } = {}) {
  const animal = booking.animalSnapshot || {};
  const service = booking.service?.type
    ? {
        type: booking.service.type,
        label: booking.service.label,
        mode: booking.service.mode,
        durationMinutes: booking.service.durationMinutes,
        description: booking.service.description || '',
      }
    : { type: 'home_visit', label: 'Home visit', mode: 'in_person', durationMinutes: 120, description: '' };
  const startAt = dateTimeFrom(booking.date, booking.startTime);
  const hoursUntil = (startAt.getTime() - Date.now()) / 3_600_000;
  const canChange = ['pending', 'confirmed'].includes(booking.status) && hoursUntil > 24;
  const merchant = booking.merchantId && booking.merchantId.name ? booking.merchantId : null;
  const customer = booking.customerId && booking.customerId.name ? booking.customerId : null;
  const payment = booking.paymentId && booking.paymentId.providerRef ? booking.paymentId : null;

  const payload = {
    id: toId(booking),
    status: booking.status,
    service,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationHours: booking.durationHours,
    animal: {
      id: toId(booking.animalId),
      name: animal.name,
      imageUrl: animal.imageUrl || '',
      species: animal.species || '',
      breed: animal.breed || '',
    },
    merchant: merchant
      ? {
          id: toId(merchant),
          name: merchant.name,
          businessType: merchant.businessType,
          city: merchant.city || '',
          verified: Boolean(merchant.verified),
        }
      : null,
    contact: booking.contact,
    pricing: booking.pricing,
    paymentStatus: booking.paymentStatus,
    payment: payment
      ? {
          receiptNumber: payment.receiptNumber,
          provider: payment.provider,
          status: payment.status,
          amount: payment.amount,
        }
      : null,
    reviewId: booking.reviewId ? toId(booking.reviewId) : null,
    merchantNote: booking.merchantNote || '',
    statusHistory: (booking.statusHistory || []).map((entry) => ({
      status: entry.status,
      at: entry.at,
      actorRole: entry.actorRole,
      note: entry.note || '',
    })),
    cancellation: booking.cancellation?.at ? booking.cancellation : null,
    actions: {
      canCancel: canChange && viewer !== 'merchant',
      canReschedule: canChange,
      canReview: booking.status === 'completed' && !booking.reviewId && viewer === 'customer',
    },
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };

  if (viewer === 'merchant' || viewer === 'admin') payload.customer = customerSummary(customer);
  if (viewer === 'admin') payload.merchantRecord = merchant ? serializeMerchantAdmin(merchant) : null;
  return payload;
}

function serializeMerchantAdmin(merchant) {
  return {
    id: toId(merchant),
    name: merchant.name,
    email: merchant.email,
    status: merchant.status,
    verified: merchant.verified,
  };
}
