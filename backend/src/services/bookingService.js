import Animal from '../models/Animal.js';
import Booking from '../models/Booking.js';
import Merchant from '../models/Merchant.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { localDateString } from '../lib/time.js';
import { assertSlotBookable } from './availabilityService.js';
import { calculatePricing, endTimeFor, hoursUntilBooking } from './scheduling.js';
import { charge, refund } from './paymentService.js';
import { notify } from './notificationService.js';
import { recordAudit } from './auditService.js';
import { logger } from '../lib/logger.js';

const POPULATE = [
  { path: 'animalId', select: 'name imageUrl species breed' },
  { path: 'merchantId', select: 'name email businessType city verified status' },
  { path: 'customerId', select: 'name email phone city' },
  { path: 'paymentId' },
];

export function bookingQuery(filter) {
  return Booking.findOne(filter).populate(POPULATE);
}

function historyEntry(status, actorRole, actorId, note = '') {
  return { status, at: new Date(), actorRole, actorId: String(actorId || ''), note };
}

export async function createBooking({ customer, input, req }) {
  const animal = await Animal.findOne({
    _id: input.animalId,
    isActive: true,
    visibility: 'public',
    moderationStatus: 'visible',
  }).populate('merchantId', 'name email status');

  if (!animal) throw notFound('Companion not found');
  if (!animal.merchantId || animal.merchantId.status !== 'active') {
    throw conflict('This companion is not accepting visits right now');
  }

  const slot = await assertSlotBookable({
    animalId: animal._id,
    date: input.date,
    startTime: input.startTime,
  });

  const pricing = calculatePricing(animal.price, input.serviceType || 'home_visit');
  const serviceEndTime = endTimeFor(slot.startTime, pricing.service.durationMinutes);
  const contact = {
    name: input.contact.name || customer.name,
    email: input.contact.email || customer.email,
    phone: input.contact.phone,
    address: input.contact.address || '',
    city: input.contact.city || animal.city || customer.city || '',
    notes: input.contact.notes || '',
  };

  let booking;
  try {
    booking = await Booking.create({
      customerId: customer._id,
      merchantId: animal.merchantId._id,
      animalId: animal._id,
      animalSnapshot: {
        name: animal.name,
        imageUrl: animal.imageUrl,
        species: animal.species,
        breed: animal.breed,
      },
      service: pricing.service,
      date: input.date,
      startTime: slot.startTime,
      endTime: serviceEndTime,
      durationHours: pricing.hours,
      status: 'pending',
      active: true,
      contact,
      pricing,
      paymentStatus: 'pending',
      statusHistory: [historyEntry('pending', 'customer', customer._id, 'Visit requested')],
    });
  } catch (error) {
    if (error?.code === 11000) throw conflict('That time was just booked. Pick another slot.');
    throw error;
  }

  let payment;
  try {
    payment = await charge({
      bookingId: booking._id,
      customerId: customer._id,
      merchantId: animal.merchantId._id,
      amount: pricing.total,
      metadata: { companions: 1, date: input.date, startTime: slot.startTime },
    });
    booking.paymentId = payment._id;
    booking.paymentStatus = 'paid';
    booking.statusHistory.push(historyEntry('pending', 'system', '', 'Sandbox payment captured'));
    await booking.save();
  } catch (error) {
    await Booking.deleteOne({ _id: booking._id });
    throw error;
  }

  await Animal.updateOne({ _id: animal._id }, { $inc: { bookingCount: 1 } });

  const populated = await bookingQuery({ _id: booking._id });
  const when = `${booking.date} at ${booking.startTime}`;

  await notify({
    recipientId: customer._id,
    recipientRole: 'customer',
    type: 'booking_received',
    title: 'Visit requested',
    body: `${animal.name} · ${when} · ${pricing.service.label}. We are waiting for the host to confirm.`,
    link: `/visits/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });
  await notify({
    recipientId: animal.merchantId._id,
    recipientRole: 'merchant',
    type: 'booking_received',
    title: 'New visit request',
    body: `${customer.name} booked ${animal.name} · ${when} · ${pricing.service.label}.`,
    link: '/merchant/bookings',
    data: { bookingId: String(booking._id) },
  });
  await recordAudit(req, {
    action: 'booking.created',
    targetType: 'booking',
    targetId: booking._id,
    metadata: { animalId: String(animal._id), total: pricing.total },
  });

  return populated;
}

function statusFilter(status, today = localDateString()) {
  if (status === 'upcoming') return { status: { $in: ['pending', 'confirmed'] }, date: { $gte: today } };
  if (status === 'past') {
    return {
      $or: [{ status: { $in: ['completed', 'cancelled', 'declined'] } }, { date: { $lt: today } }],
    };
  }
  if (status) return { status };
  return {};
}

export async function listCustomerBookings({ customerId, status, page, pageSize }) {
  const filter = { customerId, ...statusFilter(status) };
  const [total, items] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate(POPULATE)
      .sort(status === 'upcoming' ? { date: 1, startTime: 1 } : { createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
  ]);
  return { total, items };
}

export async function listMerchantBookings({ merchantId, status, page, pageSize }) {
  const filter = { merchantId, ...(status ? { status } : {}) };
  const [total, items] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate(POPULATE)
      .sort({ date: 1, startTime: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
  ]);
  return { total, items };
}

export async function getBookingForCustomer(bookingId, customerId) {
  const booking = await bookingQuery({ _id: bookingId });
  if (!booking) throw notFound('Booking not found');
  if (String(booking.customerId?._id || booking.customerId) !== String(customerId)) throw forbidden();
  return booking;
}

export async function getBookingForMerchant(bookingId, merchantId) {
  const booking = await bookingQuery({ _id: bookingId, merchantId });
  if (!booking) throw notFound('Booking not found');
  return booking;
}

async function refundIfPaid(booking, reason) {
  if (booking.paymentId) {
    await refund(booking.paymentId._id || booking.paymentId, { reason });
    booking.paymentStatus = 'refunded';
  }
}

export async function cancelBooking({ booking, actorRole, reason, req }) {
  if (!['pending', 'confirmed'].includes(booking.status)) throw conflict('This visit can no longer be cancelled');
  if (hoursUntilBooking(booking) <= 24) throw conflict('Visits can only be cancelled more than 24 hours in advance');

  await refundIfPaid(booking, reason || 'customer_cancelled');
  booking.status = 'cancelled';
  booking.active = false;
  booking.cancellation = {
    by: actorRole,
    reason: reason || '',
    at: new Date(),
    refundAmount: booking.pricing.total,
  };
  booking.statusHistory.push(historyEntry('cancelled', actorRole, req?.auth?.sub, reason || 'Cancelled'));
  await booking.save();
  await Animal.updateOne({ _id: booking.animalId._id || booking.animalId }, { $inc: { bookingCount: -1 } });

  const isCustomer = actorRole === 'customer';
  await notify({
    recipientId: isCustomer ? booking.merchantId._id : booking.customerId._id,
    recipientRole: isCustomer ? 'merchant' : 'customer',
    type: 'booking_cancelled',
    title: 'Visit cancelled',
    body: `${booking.animalSnapshot.name} · ${booking.date} at ${booking.startTime} was cancelled.${booking.paymentStatus === 'refunded' ? ' The payment was refunded.' : ''}`,
    link: isCustomer ? '/merchant/bookings' : `/visits/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });
  await recordAudit(req, {
    action: 'booking.cancelled',
    targetType: 'booking',
    targetId: booking._id,
    metadata: { actorRole, reason: reason || '' },
  });
  return booking;
}

export async function acceptBooking({ booking, note, req }) {
  if (booking.status === 'confirmed') return booking;
  if (booking.status !== 'pending') throw conflict('Only pending requests can be accepted');
  booking.status = 'confirmed';
  booking.merchantNote = note || booking.merchantNote;
  booking.statusHistory.push(historyEntry('confirmed', 'merchant', req?.auth?.sub, note || 'Confirmed by host'));
  await booking.save();
  await notify({
    recipientId: booking.customerId._id,
    recipientRole: 'customer',
    type: 'booking_confirmed',
    title: `${booking.animalSnapshot.name} confirmed your visit`,
    body: `${booking.date} at ${booking.startTime}. We cannot wait to meet you.`,
    link: `/visits/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });
  await recordAudit(req, { action: 'booking.accepted', targetType: 'booking', targetId: booking._id });
  return booking;
}

export async function declineBooking({ booking, note, req }) {
  if (!['pending', 'confirmed'].includes(booking.status)) throw conflict('This request can no longer be declined');
  await refundIfPaid(booking, 'host_declined');
  booking.status = 'declined';
  booking.active = false;
  booking.merchantNote = note || 'Declined by host';
  booking.statusHistory.push(historyEntry('declined', 'merchant', req?.auth?.sub, note || 'Declined by host'));
  await booking.save();
  await Animal.updateOne({ _id: booking.animalId._id || booking.animalId }, { $inc: { bookingCount: -1 } });
  await notify({
    recipientId: booking.customerId._id,
    recipientRole: 'customer',
    type: 'booking_declined',
    title: 'Visit could not be confirmed',
    body: `${booking.animalSnapshot.name} · ${booking.date} at ${booking.startTime}. Your payment has been refunded. ${note || ''}`.trim(),
    link: `/visits/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });
  await recordAudit(req, {
    action: 'booking.declined',
    targetType: 'booking',
    targetId: booking._id,
    metadata: { reason: note || '' },
  });
  return booking;
}

export async function completeBooking({ booking, req }) {
  if (booking.status === 'completed') return booking;
  if (booking.status !== 'confirmed') throw conflict('Only confirmed visits can be completed');
  if (booking.date > localDateString()) throw conflict('This visit has not happened yet');
  booking.status = 'completed';
  booking.active = false;
  booking.statusHistory.push(historyEntry('completed', 'merchant', req?.auth?.sub, 'Visit completed'));
  await booking.save();
  await notify({
    recipientId: booking.customerId._id,
    recipientRole: 'customer',
    type: 'booking_completed',
    title: 'How was your visit?',
    body: `Share a review for ${booking.animalSnapshot.name} and help other guests.`,
    link: `/visits/${booking._id}`,
    data: { bookingId: String(booking._id) },
  });
  await recordAudit(req, { action: 'booking.completed', targetType: 'booking', targetId: booking._id });
  return booking;
}

export async function rescheduleBooking({ booking, date, startTime, actorRole, note, req }) {
  if (!['pending', 'confirmed'].includes(booking.status)) throw conflict('This visit can no longer be rescheduled');
  if (hoursUntilBooking(booking) <= 24) throw conflict('Visits can only be rescheduled more than 24 hours in advance');

  const slot = await assertSlotBookable({
    animalId: booking.animalId._id || booking.animalId,
    date,
    startTime,
    excludeBookingId: booking._id,
  });

  const old = `${booking.date} ${booking.startTime}–${booking.endTime}`;
  booking.date = date;
  booking.startTime = slot.startTime;
  booking.endTime = slot.endTime;
  booking.status = actorRole === 'merchant' ? 'confirmed' : 'pending';
  booking.merchantNote = note || booking.merchantNote;
  booking.statusHistory.push(
    historyEntry(
      booking.status,
      actorRole,
      req?.auth?.sub,
      note || `Moved from ${old} to ${date} ${slot.startTime}–${slot.endTime}`,
    ),
  );
  await booking.save();

  const counterparty =
    actorRole === 'merchant'
      ? { id: booking.customerId._id, role: 'customer', link: `/visits/${booking._id}` }
      : { id: booking.merchantId._id, role: 'merchant', link: '/merchant/bookings' };

  await notify({
    recipientId: counterparty.id,
    recipientRole: counterparty.role,
    type: 'booking_rescheduled',
    title: 'Visit rescheduled',
    body: `${booking.animalSnapshot.name} is now ${date} at ${slot.startTime}. ${note || ''}`.trim(),
    link: counterparty.link,
    data: { bookingId: String(booking._id) },
  });
  await recordAudit(req, {
    action: 'booking.rescheduled',
    targetType: 'booking',
    targetId: booking._id,
    metadata: { date, startTime, actorRole },
  });
  return booking;
}

/**
 * Close out visits whose date has passed. Called opportunistically when
 * bookings are listed and by the hourly scheduler in server.js.
 */
export async function sweepPastBookings(now = new Date()) {
  const today = localDateString(now);
  const stale = await Booking.find({
    date: { $lt: today },
    status: { $in: ['pending', 'confirmed'] },
    active: true,
  }).limit(100);

  for (const booking of stale) {
    if (booking.status === 'confirmed') {
      booking.status = 'completed';
      booking.active = false;
      booking.statusHistory.push(historyEntry('completed', 'system', '', 'Automatically closed after the visit date'));
      await booking.save();
      await notify({
        recipientId: booking.customerId,
        recipientRole: 'customer',
        type: 'booking_completed',
        title: 'How was your visit?',
        body: `Share a review for ${booking.animalSnapshot.name}.`,
        link: `/visits/${booking._id}`,
        data: { bookingId: String(booking._id) },
      });
    } else {
      if (booking.paymentId) await refund(booking.paymentId, { reason: 'host_did_not_confirm' });
      booking.status = 'declined';
      booking.active = false;
      booking.paymentStatus = booking.paymentId ? 'refunded' : booking.paymentStatus;
      booking.cancellation = {
        by: 'system',
        reason: 'Host did not confirm before the visit date',
        at: new Date(),
        refundAmount: booking.pricing.total,
      };
      booking.statusHistory.push(historyEntry('declined', 'system', '', 'Host did not confirm in time'));
      await booking.save();
      await Animal.updateOne({ _id: booking.animalId }, { $inc: { bookingCount: -1 } });
      await notify({
        recipientId: booking.customerId,
        recipientRole: 'customer',
        type: 'booking_declined',
        title: 'Visit could not be confirmed',
        body: `${booking.animalSnapshot.name} was not confirmed in time. Your payment has been refunded.`,
        link: `/visits/${booking._id}`,
        data: { bookingId: String(booking._id) },
      });
    }
  }

  if (stale.length) logger.info('booking.sweep', { processed: stale.length });
  return stale.length;
}

export async function countActiveBookingsForMerchant(merchantId) {
  return Booking.countDocuments({ merchantId, status: { $in: ['pending', 'confirmed'] } });
}

export async function getMerchantRecord(merchantId) {
  return Merchant.findById(merchantId).lean();
}
