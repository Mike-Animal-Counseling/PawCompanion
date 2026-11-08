const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseLocalDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

export function formatDate(value, { weekday = false, year = true, short = false } = {}) {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  const month = short ? MONTHS[date.getMonth()] : date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const prefix = weekday ? `${WEEKDAYS[date.getDay()]}, ` : '';
  return `${prefix}${month} ${day}${year ? `, ${date.getFullYear()}` : ''}`;
}

export function formatDateShort(value) {
  return formatDate(value, { short: true, year: false });
}

export function formatWeekday(value) {
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? '' : WEEKDAYS[date.getDay()];
}

export function formatTime(value) {
  if (!value) return '';
  const [hour, minute] = String(value).split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 || 12;
  return `${normalized}:${String(minute || 0).padStart(2, '0')} ${suffix}`;
}

export function formatTimeRange(start, end) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function timeUntil(value) {
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  if (Number.isNaN(date.getTime())) return '';
  if (diff <= 0) return 'Now';
  const minutes = Math.ceil(diff / 60_000);
  if (minutes < 60) return `In ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `In ${hours} hr${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  if (days === 1) return 'Tomorrow';
  if (days < 14) return `In ${days} days`;
  return formatDateShort(date);
}

export function relativeTime(value) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(date.getTime())) return '—';
  if (diff < 60_000) return 'Just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDateShort(date);
}

export function formatCurrency(value, { decimals } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '$0';
  const fractionDigits = decimals ?? (Number.isInteger(number) ? 0 : 2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(number);
}

export function initials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function ageFromMonths(months) {
  const value = Number(months) || 0;
  if (value < 12) return `${value} month${value === 1 ? '' : 's'}`;
  const years = Math.floor(value / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

export function speciesLabel(species) {
  const labels = { cat: 'Cat', dog: 'Dog', rabbit: 'Rabbit', hamster: 'Hamster', parrot: 'Parrot', other: 'Companion' };
  return labels[species] || 'Companion';
}

export function genderLabel(gender) {
  return { female: 'Female', male: 'Male', unknown: 'Not specified' }[gender] || 'Not specified';
}

export const BOOKING_STATUS = {
  pending: { label: 'Awaiting host', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  completed: { label: 'Completed', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: '' },
  declined: { label: 'Declined', variant: 'danger' },
};

export function bookingStatus(status) {
  return BOOKING_STATUS[status] || { label: status, variant: '' };
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const REVIEW_RATINGS = [5, 4, 3, 2, 1];
