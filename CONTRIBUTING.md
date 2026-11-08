# Contributing

Thanks for helping make PawCompanion better. This project spans a consumer app, a partner console and a safety-sensitive operations layer; small, well-tested changes are better than broad rewrites.

## Local setup

Requires Node.js 24+.

```bash
git clone https://github.com/Mike-Animal-Counseling/paw-companion.git
cd paw-companion
npm --prefix backend ci
npm --prefix frontend ci
npm run demo
```

`npm run demo` starts an in-memory MongoDB, seeds the demo, starts the API on `:5000` and Vite on `:3000`. Demo credentials are printed on startup.

Prefer your own database?

```bash
cd backend
cp .env.example .env
# set MONGO_URI and JWT_SECRET
npm run seed
npm run dev
```

```bash
cd frontend
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run demo` | Full demo: memory Mongo + seed + API + web |
| `npm run demo:api` | Same without the web server |
| `npm run dev` | API with `--watch` |
| `npm run dev:web` | Vite dev server |
| `npm run seed` | Reset demo collections against `MONGO_URI` |
| `npm test` | Backend test suite |
| `npm run build` | Production frontend build |

Individual backend commands live in `backend/package.json`.

## Tests

- Backend tests use Node's test runner, `supertest` and `mongodb-memory-server` (or `TEST_MONGO_URI` if you have a disposable MongoDB).
- Add integration tests for new endpoints and unit tests for safety/risk/pricing logic.
- Safety-sensitive changes must include a high-risk, a medium-risk and a benign case.
- Booking changes must cover the conflict path and the refund path.
- Run the full suite before opening a pull request.

## Conventions

- **JavaScript ESM** on both sides. No TypeScript migration yet; keep functions small and validate at the boundary.
- **Backend layers:** routers handle HTTP only; domain rules go in `services/`; persistence in `models/`; request validation in `validators/`; response shapes in `serializers/`.
- **Errors:** throw `AppError` helpers from `lib/errors.js`; never send raw exception messages to clients.
- **API shape:** success `{ data }` or `{ data, meta }`; errors `{ error: { code, message }, requestId }`.
- **Frontend:** CSS Modules + shared tokens; no inline styles except tiny dynamic geometry. Use the primitives in `components/`.
- **Accessibility:** labels, `aria-*` state, keyboard handling, focus management and reduced motion are part of the definition of done.
- **Privacy:** do not log message text, tokens, cookies or full emails. Risk logs contain derived signals only.
- **Money:** prices are computed on the server. Never trust a client-supplied amount.

## Commits and pull requests

1. Keep the change focused and describe the user-visible or safety impact.
2. Include a test or explain why none is possible.
3. Update the relevant doc (`Architecture.md`, `docs/API.md`, `docs/SAFETY.md`, `docs/DEPLOYMENT.md`).
4. Do not commit `.env`, secrets, database dumps or real user data.
5. For safety, payment or auth changes, say what you verified manually and what remains unverified.

## Reporting security issues

Follow [SECURITY.md](SECURITY.md). Do not open a public issue with an exploit or real user data.

## Reporting safety concerns

If a change affects crisis detection, support mode, risk scoring or data retention, document the reasoning in `docs/SAFETY.md` and request a second review. Companion safety and guest safety take precedence over engagement.
