import AnimalAvailability from '../models/AnimalAvailability.js';
import Booking from '../models/Booking.js';
import { conflict } from '../lib/errors.js';
import { addDaysString, localDateString } from '../lib/time.js';
import {
  ACTIVE_BOOKING_STATUSES,
  DAILY_SLOT_LIMIT,
  defaultSlots,
  endTimeFor,
  firstBookableDate,
  isBookableDate,
} from './scheduling.js';

export async function getConfiguredSlots(animalId, date) {
  const availability = await AnimalAvailability.findOne({ animalId, date }).lean();
  return availability?.slots?.length ? availability.slots : defaultSlots();
}

export async function getBookedStartTimes(animalId, date, { excludeBookingId } = {}) {
  const query = {
    animalId,
    date: String(date),
    status: { $in: ACTIVE_BOOKING_STATUSES },
    active: true,
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const bookings = await Booking.find(query).select('startTime').lean();
  return new Set(bookings.map((booking) => booking.startTime));
}

export async function getDayAvailability(animalId, date, { excludeBookingId, now = new Date() } = {}) {
  const slots = await getConfiguredSlots(animalId, date);
  const booked = await getBookedStartTimes(animalId, date, { excludeBookingId });
  const bookable = isBookableDate(date, now);
  const bookableCount = Math.max(0, DAILY_SLOT_LIMIT - booked.size);

  return {
    date,
    bookable,
    slots: slots.map((slot) => {
      let reason = '';
      if (!slot.enabled) reason = 'closed';
      else if (!bookable) reason = 'window';
      else if (booked.has(slot.startTime)) reason = 'booked';
      else if (booked.size >= DAILY_SLOT_LIMIT) reason = 'daily_limit';
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: !reason,
        ...(reason ? { reason } : {}),
      };
    }),
    remaining: Math.min(bookableCount, DAILY_SLOT_LIMIT),
  };
}

export async function findNextAvailable(animalId, { from = firstBookableDate(), days = 14, excludeBookingId } = {}) {
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDaysString(from, offset);
    const day = await getDayAvailability(animalId, date, { excludeBookingId });
    const availableSlots = day.slots.filter((slot) => slot.available);
    if (availableSlots.length) return { date, slots: availableSlots };
  }
  return null;
}

export async function assertSlotBookable({ animalId, date, startTime, excludeBookingId, now = new Date() }) {
  if (!isBookableDate(date, now)) {
    throw conflict('Choose a date between tomorrow and 60 days from now');
  }
  const slots = await getConfiguredSlots(animalId, date);
  const slot = slots.find((item) => item.startTime === startTime);
  if (!slot || !slot.enabled) throw conflict('That start time is not offered for this companion');

  const bookingQuery = {
    animalId,
    date: String(date),
    status: { $in: ACTIVE_BOOKING_STATUSES },
    active: true,
  };
  if (excludeBookingId) bookingQuery._id = { $ne: excludeBookingId };

  const existing = await Booking.findOne(bookingQuery);
  if (existing?.startTime === startTime) throw conflict('That time was just booked. Pick another slot.');
  const dayCount = await Booking.countDocuments(bookingQuery);
  if (dayCount >= DAILY_SLOT_LIMIT) throw conflict('This companion is fully booked for that day');

  return { startTime: slot.startTime, endTime: slot.endTime || endTimeFor(startTime) };
}

export async function saveDayAvailability(animalId, date, slots) {
  const sanitized = slots
    .map((slot) => ({
      startTime: slot.startTime,
      endTime: endTimeFor(slot.startTime),
      enabled: Boolean(slot.enabled),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return AnimalAvailability.findOneAndUpdate(
    { animalId, date },
    { $set: { animalId, date, slots: sanitized } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function availabilityCalendar(animalId, { days = 21, now = new Date() } = {}) {
  const start = localDateString(now);
  const dates = Array.from({ length: days }, (_, offset) => addDaysString(start, offset + 1));
  const configured = await AnimalAvailability.find({ animalId, date: { $in: dates } }).lean();
  const byDate = new Map(configured.map((entry) => [entry.date, entry.slots]));
  return dates.map((date) => {
    const slots = byDate.get(date) || defaultSlots();
    return {
      date,
      enabledCount: slots.filter((slot) => slot.enabled).length,
      totalCount: slots.length,
      slots,
    };
  });
}
