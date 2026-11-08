import { addDaysString, dateTimeFrom, localDateString } from '../lib/time.js';

export const SLOT_STARTS = ['09:00', '11:00', '13:00', '15:00', '17:00'];
export const SLOT_HOURS = 2;
export const SLOT_MINUTES = SLOT_HOURS * 60;
export const DAILY_SLOT_LIMIT = 2;
export const BOOKING_WINDOW_DAYS = 60;
export const SERVICE_FEE_RATE = 0.08;
export const CURRENCY = 'USD';

export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];

export const SERVICES = {
  home_visit: {
    type: 'home_visit',
    label: 'Home visit',
    mode: 'in_person',
    durationMinutes: 120,
    multiplier: 1,
    description: 'Two relaxed hours with your companion at home or a meeting point agreed with the host.',
    badge: 'Most booked',
  },
  walk: {
    type: 'walk',
    label: 'Walk & talk',
    mode: 'in_person',
    durationMinutes: 120,
    multiplier: 1,
    description: 'A two-hour walk, sniff and chat. Best for dogs who like to be outside, and people who think better on their feet.',
    badge: '',
  },
  cafe_meet: {
    type: 'cafe_meet',
    label: 'Café meetup',
    mode: 'in_person',
    durationMinutes: 120,
    multiplier: 1,
    description: 'Meet at the partner café or shelter. A low-pressure first visit with a drink and plenty of space.',
    badge: 'Good first visit',
  },
  video_call: {
    type: 'video_call',
    label: 'Video call',
    mode: 'online',
    durationMinutes: 30,
    multiplier: 1.2,
    description: 'A thirty-minute live video call with the companion and their host. For days when leaving the house is too much.',
    badge: 'Online',
  },
};

export const SERVICE_TYPES = Object.keys(SERVICES);

export function getService(serviceType) {
  return SERVICES[serviceType] || SERVICES.home_visit;
}

export function endTimeFor(startTime, durationMinutes = SLOT_MINUTES) {
  const [hour, minute] = String(startTime).split(':').map(Number);
  const total = hour * 60 + (minute || 0) + Number(durationMinutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function defaultSlots() {
  return SLOT_STARTS.map((startTime) => ({
    startTime,
    endTime: endTimeFor(startTime),
    enabled: true,
  }));
}

export function calculatePricing(hourlyRate, serviceType = 'home_visit') {
  const service = getService(serviceType);
  const rate = Math.max(0, Number(hourlyRate) || 0);
  const hours = Math.round((service.durationMinutes / 60) * 100) / 100;
  const subtotal = Math.round(rate * hours * service.multiplier * 100) / 100;
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE * 100) / 100;
  return {
    service: {
      type: service.type,
      label: service.label,
      mode: service.mode,
      durationMinutes: service.durationMinutes,
      description: service.description,
      badge: service.badge,
    },
    hourlyRate: rate,
    hours,
    subtotal,
    serviceFee,
    total: Math.round((subtotal + serviceFee) * 100) / 100,
    currency: CURRENCY,
  };
}

export function servicesForAnimal(hourlyRate) {
  return SERVICE_TYPES.map((type) => {
    const pricing = calculatePricing(hourlyRate, type);
    return {
      ...pricing.service,
      pricing: {
        subtotal: pricing.subtotal,
        serviceFee: pricing.serviceFee,
        total: pricing.total,
        currency: pricing.currency,
      },
    };
  });
}

export function firstBookableDate(now = new Date()) {
  return addDaysString(localDateString(now), 1);
}

export function lastBookableDate(now = new Date()) {
  return addDaysString(localDateString(now), BOOKING_WINDOW_DAYS);
}

export function bookingStart(date, startTime) {
  return dateTimeFrom(date, startTime);
}

export function hoursUntilBooking(booking, now = new Date()) {
  return (bookingStart(booking.date, booking.startTime).getTime() - now.getTime()) / 3_600_000;
}

export function isBookableDate(date, now = new Date()) {
  return date >= firstBookableDate(now) && date <= lastBookableDate(now);
}
