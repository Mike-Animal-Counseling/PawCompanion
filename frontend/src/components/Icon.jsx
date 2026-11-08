import React from 'react';

const PATHS = {
  paw: (
    <>
      <circle cx="6.5" cy="9.2" r="1.9" />
      <circle cx="10.4" cy="5.8" r="1.9" />
      <circle cx="15.3" cy="5.8" r="1.9" />
      <circle cx="19" cy="9.2" r="1.9" />
      <path d="M12 11.2c-3.1 0-5.7 2.1-5.7 4.5 0 1.8 1.5 2.8 3.4 2.8.9 0 1.7-.35 2.3-.35s1.4.35 2.3.35c1.9 0 3.4-1 3.4-2.8 0-2.4-2.6-4.5-5.7-4.5Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4.2 4.2" />
    </>
  ),
  heart: <path d="M12 20s-7.3-4.3-8.6-9.2C2.4 7.4 4.5 4.7 7.5 4.7c2 0 3.4 1.2 4.5 2.8 1.1-1.6 2.5-2.8 4.5-2.8 3 0 5.1 2.7 4.1 6.1C19.3 15.7 12 20 12 20Z" />,
  'heart-filled': (
    <path
      d="M12 20s-7.3-4.3-8.6-9.2C2.4 7.4 4.5 4.7 7.5 4.7c2 0 3.4 1.2 4.5 2.8 1.1-1.6 2.5-2.8 4.5-2.8 3 0 5.1 2.7 4.1 6.1C19.3 15.7 12 20 12 20Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </>
  ),
  chat: (
    <>
      <path d="M20.5 11.5a8.2 8.2 0 0 1-8.5 8.1 9.3 9.3 0 0 1-3.4-.7L4 20.5l1.5-4.2a7.9 7.9 0 0 1-1.2-4.8A8.2 8.2 0 0 1 12.9 3.4a8.2 8.2 0 0 1 7.6 8.1Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c.7-3.4 3.7-5.4 7.2-5.4s6.5 2 7.2 5.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 19.5c.6-3 3.2-4.8 6.2-4.8s5.6 1.8 6.2 4.8M16 5.7a3 3 0 0 1 0 5.8M17.5 14.9c2 .5 3.4 2 3.8 4.2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  'chevron-left': <path d="m14.5 5-7 7 7 7" />,
  'chevron-right': <path d="m9.5 5 7 7-7 7" />,
  'chevron-down': <path d="m5 9.5 7 7 7-7" />,
  'arrow-right': <path d="M4 12h16m-6-6 6 6-6 6" />,
  'arrow-left': <path d="M20 12H4m6 6-6-6 6-6" />,
  star: <path d="m12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.8L12 3.5Z" />,
  'star-filled': (
    <path
      d="m12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.8L12 3.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  shield: (
    <>
      <path d="M12 3.2c2.3 1.6 4.6 2.4 7 2.4v6.1c0 4.2-2.8 7.4-7 9.1-4.2-1.7-7-4.9-7-9.1V5.6c2.4 0 4.7-.8 7-2.4Z" />
      <path d="m8.8 11.8 2.1 2.2 4.4-4.3" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5c.5 3.7 1.8 5 5.5 5.5-3.7.5-5 1.8-5.5 5.5-.5-3.7-1.8-5-5.5-5.5 3.7-.5 5-1.8 5.5-5.5Z" />
      <path d="M18.5 14.5c.25 1.8.9 2.45 2.7 2.7-1.8.25-2.45.9-2.7 2.7-.25-1.8-.9-2.45-2.7-2.7 1.8-.25 2.45-.9 2.7-2.7Z" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s7-5.7 7-11.2a7 7 0 1 0-14 0C5 15.3 12 21 12 21Z" />
      <circle cx="12" cy="9.6" r="2.4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8 12.3 2.6 2.6L16.4 9" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4.2L19.5 8.7a2.4 2.4 0 0 0-3.4-3.4L4.8 16.6 4 20Z" />
      <path d="m14.5 6.8 3.4 3.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15M9 3.8h6M6.5 6.5l.9 14h9.2l.9-14M10 10.5v6M14 10.5v6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4.5 17 4.7-4.7 3.3 3.3 2.6-2.6 4.4 4.4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
      <path d="M4 15.5v2.8A1.7 1.7 0 0 0 5.7 20h12.6a1.7 1.7 0 0 0 1.7-1.7v-2.8" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4.5h3A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-3M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeWidth="2.4" strokeLinecap="round" />,
  alert: (
    <>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9v5M12 17h.01" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  phone: <path d="M6.5 3.8h3l1.5 4-2 1.5a12 12 0 0 0 5.7 5.7l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.8 17.8 0 0 1 4.5 6a2 2 0 0 1 2-2.2Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 9.5h16.4M3.8 14.5h16.4M12 3.5c2.3 2.4 3.5 5.4 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.4-3.5-8.5S9.7 5.9 12 3.5Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 10.5 8.5-7 8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1v-9.5Z" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9a2.6 2.6 0 1 1 3.4 2.5c-.6.2-.9.7-.9 1.3v.7M12 17h.01" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  send: <path d="m3.5 11.5 17-7-5.5 16-3.5-6-8-3Z" />,
  refresh: (
    <>
      <path d="M20.5 11.5a8.5 8.5 0 1 0-2.6 6.2" />
      <path d="M20.5 4.5v6h-6" />
    </>
  ),
  'credit-card': (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.5" />
      <path d="M2.8 9.5h18.4M6.5 15h3" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  external: <path d="M14 4.5h5.5V10M19 5l-8 8M19 14v4.5A1.5 1.5 0 0 1 17.5 20h-12A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5H10" />,
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h10A2.5 2.5 0 0 1 19 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 4 17.5v-10Z" />
      <path d="M4 8.5h15M15.5 13.5h2" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function Icon({ name, size = 20, strokeWidth = 1.7, className, title }) {
  const content = PATHS[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}
