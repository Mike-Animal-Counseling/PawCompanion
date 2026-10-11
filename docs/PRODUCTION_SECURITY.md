# Production security requirements

Run Node 24 or later, authenticated MongoDB and authenticated TLS Redis. Set `NODE_ENV=production`, a random `JWT_SECRET` of at least 32 bytes, explicit HTTPS `CORS_ORIGINS`, and precise `TRUST_PROXY` settings. Publish the frontend and API behind the same HTTPS origin; the Vite development proxy is for local development only. Use the locked dependencies and serve the Vite `dist` directory with a restrictive CSP. Sessions are short-lived, stored in sessionStorage, and checked against the current active database account. Historical fake user identities are intentionally not accepted; customers must register or log in.

The payment implementation is a prototype. Production mock payment and checkout are disabled and return 503. Booking creation is also disabled in production until real payment processing and atomic capacity reservations are integrated; this avoids indefinite unpaid reservations. Do not enable demo payments for real users. Existing bookings can be viewed or cancelled only by their owner.

AI is disabled by default in production. Enable `ENABLE_AI=true` only with a valid provider key, explicit privacy/consent policies, and provider billing limits. Shared per-account and global budgets, bounded conversation context, 20-second provider deadlines, and bounded responses protect the public interface. This is not a clinical service; the sample crisis wording needs localization before public launch.

Uploaded images are decoded and re-encoded as JPEG, limited to 5 MiB and 16 megapixels, with randomized server filenames. Only the uploading merchant can remove the asset. The upload directory is public image storage: do not use it for private images. Legacy uploads do not pass the new allowlist and must be migrated explicitly.

Backend `npm test` exercises account ownership, role checks, upload handling, rate-store failure and disabled production mock payments. Frontend `npm run build` checks the migrated Vite application. Seed data is development-only; do not run seed scripts against production.
