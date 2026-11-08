export const SPECIES_OPTIONS = [
  { value: '', label: 'All companions' },
  { value: 'cat', label: 'Cats' },
  { value: 'dog', label: 'Dogs' },
  { value: 'rabbit', label: 'Rabbits' },
  { value: 'other', label: 'Other' },
];

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export const SESSION_HOURS = 2;
export const SERVICE_FEE_RATE = 0.08;

export const DEMO_CREDENTIALS = {
  customer: { email: 'maya@example.com', password: 'PawCompanion!2026', label: 'Guest demo' },
  merchant: { email: 'hello@willowandwhiskers.example', password: 'MerchantDemo!2026', label: 'Partner demo' },
  admin: { email: 'admin@pawcompanion.app', password: 'AdminDemo!2026', label: 'Operator demo' },
};

export const SHOW_DEMO_CREDENTIALS = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';
