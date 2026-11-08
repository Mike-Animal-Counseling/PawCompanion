export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function localDateString(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addDaysString(dateString, days) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return localDateString(date);
}

export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Combine a local date (YYYY-MM-DD) and time (HH:MM) into a Date. */
export function dateTimeFrom(dateString, timeString = '00:00') {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const [hour, minute] = String(timeString).split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function formatTimeRange(startTime, endTime) {
  return `${startTime} – ${endTime}`;
}
