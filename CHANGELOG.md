# Changelog

## 2.0.0 — Companionship, rebuilt

A full product and engineering rewrite that turns the original demo into an online + in-person companionship application.

### Added

- **Dual-track product model.** Online companionship (AI chat, daily check-ins, mood journal, bond) and in-person companionship (home visit, walk, café meetup, 30-minute video call) share one companion relationship.
- **Daily check-in system** with mood, energy, tags, private notes, companion reply, streak, seven-day series and history.
- **In-person service catalogue** with server-side pricing, four service types and online/offline modes.
- **Booking lifecycle** with atomic slot reservation, host accept/decline/complete, rescheduling, >24-hour cancellation policy, automatic sandbox refunds, receipts and reviews.
- **Companion bond** from messages, visits and favourites; shown on the companion profile.
- **Member home** with next visit, active conversations, recommendations, preferences and safety status.
- **Responsive consumer app shell** with a mobile bottom tab bar, PWA manifest/service worker, install shortcuts and route-level code splitting.
- **Merchant console:** analytics with online/in-person split, listings and photo upload, 21-day availability, visit decisions, review replies and business profile.
- **Operator console:** safety queue, partner suspension, listing/review moderation and append-only audit trail.
- **Notifications** inbox with unread counts and booking/review events.
- **Auth 2.0:** rotating refresh sessions, HttpOnly cookies, short-lived access tokens, password change, session management and account closure.
- **API foundation:** Zod validation, consistent response/error envelopes, pagination, rate budgets, request IDs, structured logs, health/readiness, graceful shutdown.
- **Safety:** English/Chinese self-harm patterns, support mode, crisis resources, derived risk profile, human review queue, data deletion.
- **Engineering:** 41 backend tests, CI, Dockerfiles, Docker Compose demo, seeded demo, API/safety/deployment docs.
- **Design system:** Fraunces/Inter, warm forest/cream/coral identity, accessible components and responsive layouts.

### Changed

- Replaced the CRA-era static animal data with MongoDB-backed discovery, filters, favourites, reviews and pagination.
- Replaced the hardcoded user and `Mr.Liang` demo identity with real customer/merchant/admin accounts.
- Replaced the mock cart/checkout with a server-priced booking flow.
- AI chat now reads real companion records; added a local persona fallback so it works without a key.
- Merchants no longer expose identity on public listings.
- Production behaviour is explicit: sandbox payments require opt-in; AI is optional; healthcare claims are removed.

### Removed

- Dead stub services for shipping, SMS/email providers and payment intents.
- The simulated payment router and legacy session/user helpers.
- CRA sample assets and stale UI screens.

### Known limitations

- No live card processor, email/SMS delivery or email verification/password reset.
- No 24/7 human crisis team; helplines need localisation.
- No recurring merchant schedules, WebSocket layer or native mobile app yet.
