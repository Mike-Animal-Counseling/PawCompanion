# API reference

Base URL: `/api` (same origin). Requests and responses are JSON except image upload.

## Conventions

**Success**

```json
{ "data": { "id": "…" } }
```

Lists include pagination meta:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 12, "total": 0, "totalPages": 0, "hasNext": false }
}
```

**Error**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the highlighted fields",
    "details": { "mood": "Too small: expected number to be >=1" }
  },
  "requestId": "b1f4…"
}
```

Codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `RATE_LIMITED`, `PAYLOAD_TOO_LARGE`, `INTERNAL_ERROR`, `UNAVAILABLE`, `ORIGIN_NOT_ALLOWED`, `HTTPS_REQUIRED`.

**Auth**

- `Authorization: Bearer <accessToken>` for protected routes.
- `pc_refresh` HttpOnly cookie for `POST /auth/refresh`; sent automatically by the web app.

**Validation** — unknown object keys are stripped; object-shaped values for scalar fields fail with 422.

**Dates / money** — `YYYY-MM-DD`, `HH:MM`; USD, server-computed.

---

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness: `{ ok, service, uptime }` |
| GET | `/ready` | — | Mongo and budget readiness; 503 when not ready |

---

## Auth and accounts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/customer/register` | — | `{ name, email, password }`; 201 + session |
| POST | `/auth/customer/login` | — | `{ email, password }` |
| POST | `/auth/merchant/register` | — | `{ name, email, password, businessType?, city?, description?, website? }` |
| POST | `/auth/merchant/login` | — | `{ email, password }` |
| POST | `/auth/admin/login` | — | `{ email, password }`; operator only |
| POST | `/auth/refresh` | cookie | Rotates the refresh session, returns a new access token |
| POST | `/auth/logout` | access + cookie | Revokes the current session and clears the cookie (204) |
| GET | `/auth/me` | access | Current account |
| PATCH | `/auth/me` | access | Profile / preferences |
| POST | `/auth/password` | access | `{ currentPassword, newPassword }`; revokes other sessions |
| GET | `/auth/sessions` | access | Active sessions with `current` flag |
| DELETE | `/auth/sessions/:sessionId` | access | Revoke one session |
| DELETE | `/auth/sessions` | access | Revoke all sessions |
| DELETE | `/auth/me` | customer | `{ password, confirmation: "DELETE" }`; closes account |

Customer `PATCH /auth/me` accepts `name`, `phone`, `city`, `marketingOptIn`, `goals[]` (`company|calm|active|support|routine`), `preferredSpecies`, `timezone`, `onboardingComplete`.

Session response:

```json
{
  "data": {
    "accessToken": "…",
    "expiresIn": 900,
    "user": { "id": "…", "role": "customer", "name": "Maya Chen", "email": "…" }
  }
}
```

---

## Member dashboard and check-ins

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/me/dashboard` | customer | App home: check-in, streak, week series, next visit, active chats, favourites, recommendations, stats, unread count, safety status |
| GET | `/me/companions` | customer | Companions with messages/visits/favourite/bond |
| GET | `/checkins/today` | customer | Today's check-in or null |
| GET | `/checkins?days=30` | customer | `{ items, streak, series, averageMood, checkedIn }` |
| POST | `/checkins` | customer | `{ mood 1–5, energy 1–5, note?, tags[]?, animalId? }`; upserts today, returns companion reply |
| DELETE | `/checkins/:checkinId` | customer | Delete a check-in |

Check-in response excerpt:

```json
{
  "data": {
    "checkin": {
      "date": "2026-11-08",
      "mood": 2,
      "mode": "support",
      "aiReply": "That sounds heavy…",
      "safetyLevel": "none"
    },
    "streak": 9,
    "safety": { "flagged": false, "level": "none", "resources": [] }
  }
}
```

If a note is flagged, `safety.flagged=true`, `checkin.safetyLevel="high"`, resources are returned and the reply is the crisis card copy.

---

## Companions

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/animals` | optional | Paginated discovery: `q`, `species`, `tag`, `city`, `minPrice`, `maxPrice`, `featured`, `sort`, `page`, `pageSize` |
| GET | `/animals/facets` | — | Species/tag/city counts, price range, verified host count |
| GET | `/animals/:animalId` | optional | Detail + host + reviews + next availability; signed-in guests also get `relationship` and `isFavorite` |
| GET | `/animals/:animalId/availability?date=` | — | Slots with `available` and `reason` |
| GET | `/animals/:animalId/reviews` | — | Published reviews, paginated |
| GET | `/favorites` | customer | Saved companions |
| GET | `/favorites/ids` | customer | Saved ids |
| POST | `/favorites/:animalId` | customer | Save |
| DELETE | `/favorites/:animalId` | customer | Remove |

Sort values: `recommended`, `newest`, `price_asc`, `price_desc`, `rating`.

Animal detail relationship shape:

```json
{
  "relationship": {
    "messages": 4,
    "visits": 2,
    "favorite": true,
    "points": 49,
    "level": 1,
    "lastChatAt": "…",
    "mode": "support"
  }
}
```

---

## Bookings and services

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/bookings/services/:animalId` | — | Service catalogue with pricing |
| GET | `/bookings/quote/:animalId?service=` | — | Single quote (kept for convenience) |
| GET | `/bookings/availability/:animalId?date=` | — | Public slots for the booking screen |
| POST | `/bookings` | customer | Reserve a visit |
| GET | `/bookings?status=&page=&pageSize=` | customer | `status`: `upcoming`, `past`, `pending`, `confirmed`, `completed`, `cancelled`, `declined` |
| GET | `/bookings/:bookingId` | customer | Detail + review |
| POST | `/bookings/:bookingId/cancel` | customer | `{ reason? }`; refunds if paid |
| POST | `/bookings/:bookingId/reschedule` | customer | `{ date, startTime }`; >24 h notice |
| POST | `/bookings/:bookingId/review` | customer | `{ rating 1–5, title?, body? }`; completed only |
| GET | `/bookings/:bookingId/review` | customer | Existing review |

Create body:

```json
{
  "animalId": "…",
  "serviceType": "home_visit",
  "date": "2026-11-10",
  "startTime": "11:00",
  "contact": {
    "name": "Maya Chen",
    "email": "maya@example.com",
    "phone": "+1 503 555 0142",
    "address": "",
    "city": "Portland",
    "notes": "First visit"
  },
  "paymentMethod": "sandbox_card",
  "acceptTerms": true
}
```

Service types: `home_visit` (120 min, in person), `walk` (120 min, in person), `cafe_meet` (120 min, in person).

Server responds with `service`, `pricing`, `statusHistory`, `paymentStatus` and computed `actions` (`canCancel`, `canReschedule`, `canReview`).

Booking status: `pending → confirmed → completed`, `cancelled`, `declined`.

---

## Digital pet companionship

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/ai/status` | customer | Model vs demo voice, disclaimer, resources |
| POST | `/ai/chat` | customer | `{ animalId, message }` |
| GET | `/ai/conversations` | customer | Conversation list with preview/mode |
| GET | `/ai/conversations/:animalId` | customer | Full thread + suggested prompts |
| DELETE | `/ai/conversations/:animalId` | customer | Clear one thread |
| DELETE | `/ai/conversations` | customer | Clear all threads |
| GET | `/ai/safety` | customer | Derived safety summary, events, resources, retention |
| DELETE | `/ai/data` | customer | Delete chats, check-ins, risk events/profile |

Chat response includes `response`, optional `image`, `meta`, `routeMeta` (`mode`, `confidence`, `provider`), `userProfile`, `digital` and `suggestedPrompts`. Crisis responses use `meta.type="crisis"` and `meta.resources`.

`digital` is the online companion contract:

```json
{
  "mood": "gentle",
  "behaviour": "settle_nearby",
  "animation": "slow_blink",
  "sound": { "key": "cat-purr-0", "url": "/sounds/cat-purr.mp3", "label": "a soft, close purr", "rate": 0.9 },
  "state": { "mood": "gentle", "energy": 68, "attention": 66, "trust": 43, "interactions": 1 }
}
```

The text is the translation; the sound is an animal vocalization. No human TTS is used. See [DIGITAL_PET.md](DIGITAL_PET.md).

---

## Notifications

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/notifications?page=&pageSize=&unreadOnly=` | any | Inbox + unread count |
| GET | `/notifications/unread-count` | any | Badge count |
| POST | `/notifications/:notificationId/read` | any | Mark one read |
| POST | `/notifications/read-all` | any | Mark all read |

Notification types: `booking_received`, `booking_confirmed`, `booking_declined`, `booking_cancelled`, `booking_rescheduled`, `booking_completed`, `review_received`, `review_reply`, `safety_check`, `system`.

---

## Partner console

All routes require a merchant session.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/merchant/overview?days=30` | Revenue, bookings, rating, repeat guests, series, online/in-person channels, upcoming, top companions, recent reviews |
| GET | `/merchant/animals` | Listings + upcoming/revenue stats |
| POST | `/merchant/animals` | Create listing |
| GET | `/merchant/animals/:animalId` | Listing detail |
| PATCH | `/merchant/animals/:animalId` | Partial update (no defaults reset) |
| DELETE | `/merchant/animals/:animalId` | Archive; blocked with upcoming visits |
| GET | `/merchant/animals/:animalId/availability?date=` | Configured slots + booked flag |
| PUT | `/merchant/animals/:animalId/availability` | `{ date, slots: [{ startTime, enabled }] }` |
| GET | `/merchant/animals/:animalId/calendar` | 21-day enabled counts |
| GET | `/merchant/bookings?status=&page=` | Visits with guest contact |
| GET | `/merchant/bookings/:bookingId` | Visit detail |
| POST | `/merchant/bookings/:bookingId/accept` | Confirm pending request |
| POST | `/merchant/bookings/:bookingId/decline` | Decline + refund |
| POST | `/merchant/bookings/:bookingId/complete` | Complete on/after visit date |
| POST | `/merchant/bookings/:bookingId/reschedule` | Move a visit |
| GET | `/merchant/reviews` | Published reviews |
| POST | `/merchant/reviews/:reviewId/reply` | Public reply |
| PATCH | `/merchant/profile` | Business profile |
| POST | `/merchant/uploads` | Multipart `image` (JPG/PNG, ≤5 MB) |
| DELETE | `/merchant/uploads` | `{ imageUrl }` owned by merchant |

---

## Operations console

All routes require an admin session.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/overview?days=30` | Platform metrics, risk counts, signup series, recent bookings/audit |
| GET | `/admin/risk?status=&page=` | Safety queue |
| GET | `/admin/risk/:userId/events` | Derived events (no raw text) |
| PATCH | `/admin/risk/:userId` | `{ action: "acknowledge"\|"resolve", note? }` |
| GET | `/admin/merchants?status=&q=&page=` | Partner list |
| PATCH | `/admin/merchants/:merchantId` | `{ status, reason? }`; suspension hides public listings |
| GET | `/admin/animals?moderationStatus=&q=&page=` | Listing moderation list |
| PATCH | `/admin/animals/:animalId` | `{ moderationStatus, reason? }` |
| GET | `/admin/reviews?status=&page=` | Review moderation list |
| PATCH | `/admin/reviews/:reviewId` | `{ status, reason? }`; recomputes ratings |
| GET | `/admin/audit` | Latest 100 audit events |

---

## Static files

| Path | Description |
| --- | --- |
| `/uploads/:ownerId-:uuid.jpeg` | Merchant-uploaded listing images; strict filename shape, immutable cache |
| `/api/health`, `/api/ready` | See above |

There is no live payment endpoint in this build. The sandbox charge and refund happen inside the booking service and are recorded in the `Payment` collection.
