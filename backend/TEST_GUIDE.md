# Test guide

## Automated

```bash
cd backend
npm test
```

The suite uses a disposable database. If `mongodb-memory-server` cannot start in your environment, point `TEST_MONGO_URI` at a local test database:

```bash
TEST_MONGO_URI=mongodb://127.0.0.1:27018/pawcompanion-test npm test
```

| File | Covers |
| --- | --- |
| `tests/auth.test.js` | register, duplicate, login, refresh rotation, logout, password change, roles, sessions, preferences |
| `tests/animals.test.js` | discovery pagination/filter/sort, facets, detail, relationship, favourites, invalid queries |
| `tests/bookings.test.js` | service pricing, duplicate slots, video calls, ownership, reschedule, refunds, reviews, merchant decisions, availability |
| `tests/checkins.test.js` | check-in create/update/streak/history, crisis screening, dashboard, bond, deletion, validation |
| `tests/security.test.js` | headers, origin, auth, forged tokens, payload limits, NoSQL shapes, static paths, budget failure, production config |
| `tests/safety.test.js` | English/Chinese high/medium/none patterns and crisis resources |

Frontend:

```bash
cd frontend
npm run build
```

CI additionally checks that the build contains no `.map` files.

## Manual smoke test

Use the demo credentials printed by `npm run demo`.

### Online track

1. Sign in as Maya. The member home shows the check-in card, 9-day streak, next visit, conversations, recommendations and stats.
2. Open **Check-in**. Change mood, energy and tags; add a note; submit. A companion reply appears and the entry is added to the chosen conversation.
3. Open **Messages** → a conversation. The support/play badge matches the thread. Send a message and confirm a reply.
4. Clear a conversation; it disappears from the list.
5. In **Account → Safety & data**, review the derived profile, then delete companion data and confirm the check-ins/history clear.

### Offline track

1. Open a companion → **Book in person**. Choose home visit, walk, café or video call. The price changes with the service.
2. Pick a date and an available slot. Complete contact details and the sandbox payment step.
3. Confirm; the success screen says the host must confirm. The visit appears under **My visits** with status “Awaiting host”.
4. Sign in as the partner. Open **Bookings** → accept the request. The guest receives a notification.
5. As the guest, reschedule more than 24 hours ahead. Confirm the time and status.
6. Cancel the visit; confirm the sandbox refund and the cancelled state.
7. For a completed visit, open the visit and submit a review. The companion rating and merchant rating update.
8. As the partner, reply to the review.

### Partner console

- Dashboard shows booking value, online/in-person split, top companions, upcoming visits and recent reviews.
- Add a listing with a photo, edit it, archive it (blocked if upcoming visits exist).
- Availability: open/close slots for a date; booked slots are read-only.
- Reviews: reply publicly.

### Operator console

- Overview shows customers, partners, GMV, live bookings, risk counts, signup chart, recent bookings and audit.
- Safety queue: open derived signals, acknowledge/resolve. No raw message text is visible.
- Suspend a partner; their public listings disappear.
- Hide/restore a listing and a review; ratings recompute.
- Audit trail records the actions.

### Mobile

Use a 390×844 viewport. The bottom tab bar (Home / Discover / Check-in / Chats / Me) is visible; the check-in form has no horizontal overflow; toasts sit above the tab bar.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `spawn EPERM` during tests | The environment blocks child processes. Use `TEST_MONGO_URI` with a running test MongoDB. |
| Login redirects to `/` unexpectedly | Rate limit or expired refresh; restart the API to reset memory budgets in development. |
| Demo images 404 | Run from the repo root; images live in `frontend/public/animals`. |
| Checks pass locally but not CI | Ensure the lockfiles are current (`npm install --package-lock-only`). |
