# Production security requirements

This build has security controls that are real, and demo boundaries that are explicit. Do not describe it as an audited production service until the checklist in [DEPLOYMENT.md](DEPLOYMENT.md) is complete.

## Transport and secrets

- Serve the frontend and API behind the same HTTPS origin.
- Set `NODE_ENV=production`, a newly generated `JWT_SECRET` of at least 32 random bytes, explicit HTTPS `CORS_ORIGIN`, an HTTPS `APP_URL` and a correct `TRUST_PROXY`.
- The server rejects placeholder secrets, wildcard/HTTP origins, a missing HTTPS app URL and production sandbox payments without an explicit opt-in.
- Never commit `.env`, provider keys, session cookies, database credentials or uploaded user images.

## Authentication

- Access tokens are short-lived HS256 JWTs held in memory by the client.
- Refresh tokens are 48 random bytes, stored only as SHA-256 hashes in the `Session` collection, delivered in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie scoped to `/api/auth`.
- Every authenticated request verifies the session row and the active account, so logout, refresh rotation and password changes take effect immediately.
- Password changes revoke other sessions; account closure requires the current password and checks for active visits.
- Login/register budgets are per email/IP; refresh and session lookup have a looser IP budget because they occur on normal page loads.
- There is no email verification or password-reset flow in this build. Add both before public launch.

## Data and queries

- Every body, query and route parameter is parsed by Zod. Object-shaped values for scalar fields are rejected before Mongo access.
- Mongoose queries use typed fields; no `$where`, no user-provided operators.
- Responses are serialised explicitly; password hashes and internal fields are never returned.
- Mongo and Redis must be authenticated and not publicly reachable. Use TLS to the database and Redis in transit where the provider supports it.
- The partial unique booking index is a correctness and abuse control; do not remove it.

## Rate limits and abuse

- Shared budgets are Redis-backed when `REDIS_URL` is set. The in-memory fallback is per process and only appropriate for a single-instance demo.
- The API combines a global IP limiter, per-IP auth limiter, per-email credential limiter, per-user chat/check-in/merchant budgets and a global chat budget.
- Provider calls have bounded timeouts and response sizes; the safety classifier degrades to keywords on failure.
- There is no CAPTCHA or device fingerprinting. Add an edge WAF/bot control for a public launch.

## Uploads

- JPG/PNG only, 5 MiB maximum, re-decoded and re-encoded as JPEG with metadata stripped.
- Randomized, owner-prefixed filenames; only the owner can delete.
- Served with `Content-Type: image/jpeg`, `Content-Security-Policy: default-src 'none'; sandbox`, immutable cache and an exact filename allowlist.
- The upload directory is public image storage. Do not store private documents there; use object storage with signed URLs when moving beyond listing photos.

## Payments

- There is no live card processor. The sandbox creates auditable `Payment` rows and refund state; no money moves.
- Production refuses to start with the sandbox provider unless `ALLOW_SANDBOX_PAYMENTS=true`. Only use that flag for a clearly labelled demo deployment.
- Before real payments: integrate Stripe (or an equivalent) with PaymentIntents, webhooks, idempotency keys, 3-D Secure, refund reconciliation and PCI scope review. Do not accept card data in this app.
- Booking creation and refunds are not idempotency-keyed yet; that is a launch blocker for live payments.

## AI and safety

- AI is disabled by default. `ENABLE_AI=true` requires a provider key, billing limits, a privacy review and updated consent copy.
- Without a key, the local persona fallback keeps the product usable; it is not a clinical service.
- Safety screening runs before every model call. High-risk messages return crisis resources and are not sent to the model.
- Risk events store derived levels/scores/timestamps, not raw text. Operators never receive raw conversation content.
- There is no 24/7 human crisis team. Publish that limitation and localise helplines before launch.
- Review the safety model with a qualified clinician and legal/privacy counsel for each launch jurisdiction.

## Privacy and retention

- Guests can delete chats, check-ins and derived risk data from Account → Safety & data.
- Account closure anonymises profile and booking contact fields, revokes sessions and deletes companion data. Financial rows are retained for receipts.
- Risk events have a 120-day TTL.
- Define a retention policy for audit events, logs and backups.
- Do not log request bodies, message content, tokens or cookies. The structured logger redacts sensitive field names.

## Verification

- `backend npm test` covers auth/session rotation, RBAC, booking conflicts/refunds, check-ins, safety screening and security regressions (41 tests at the time of writing).
- `frontend npm run build` builds lazy route chunks with no source maps.
- CI installs locked dependencies, audits, runs tests and builds the frontend.
- The test suite uses synthetic accounts and a disposable database; never point it at production data.

## Known gaps

- No live payments, email/SMS, email verification or password reset.
- No WAF, CAPTCHA, SIEM integration, on-call rotation or clinician supervision.
- No OpenTelemetry tracing or centralized error reporting.
- No automated dependency update policy beyond Dependabot/CI configuration in the repository.
- No formal penetration test or compliance certification.
