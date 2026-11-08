# PawCompanion API

Express 4 + MongoDB. See the root [README](../README.md) for the product, [Architecture](../Architecture.md) for the design and [API reference](../docs/API.md) for endpoints.

## Scripts

```bash
npm ci
npm run dev        # node --watch src/server.js
npm run demo:api   # in-memory Mongo + seed + API (no web)
npm run demo       # full demo (API + web)
npm run seed       # reset demo data in MONGO_URI
npm test           # 41 tests (uses TEST_MONGO_URI or mongodb-memory-server)
npm start          # production process
```

## Environment

Copy `.env.example` and set at minimum:

```ini
MONGO_URI=mongodb://127.0.0.1:27017/pawcompanion
JWT_SECRET=<48 random bytes>
CORS_ORIGIN=http://localhost:3000
```

`npm run demo` supplies a temporary database and secret. Production additionally requires HTTPS origins, `APP_URL`, and an explicit `ALLOW_SANDBOX_PAYMENTS=true` if you intentionally run the demo payment provider.

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Structure

```
src/
  config/       env validation, Mongo connection
  lib/          errors, logger, validation, pagination, IDs, time
  middleware/   auth, request context, error handler
  models/       Mongoose schemas and indexes
  validators/   Zod request schemas
  serializers/  stable response shapes
  services/     business logic (scheduling, booking, check-in, safety, AI, ...)
  routers/      HTTP adapters
  scripts/      seed and demo
  app.js        middleware + route mounting
  server.js     runtime + schedulers + shutdown
```

## Core invariants

- A slot can have one live booking: partial unique index `(animalId, date, startTime)` where `active:true`.
- One check-in per guest per local day.
- One review per completed booking.
- One conversation per guest + companion.
- Prices and fees are computed server-side.
- Safety screening runs before any model call.
- Every authenticated request validates the session row, so logout/rotation is immediate.

## Tests

Tests use synthetic accounts in a disposable database. Run them with a local test database if a memory server is unavailable:

```bash
TEST_MONGO_URI=mongodb://127.0.0.1:27018/pawcompanion-test npm test
```

Test files cover auth, discovery, dual-track bookings, check-ins/dashboard, safety and security regressions.
