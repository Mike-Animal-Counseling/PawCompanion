# Deployment

For the one-service Render + MongoDB Atlas demo, including the exact values to provide, see [DEPLOYMENT_SUPPORT.md](DEPLOYMENT_SUPPORT.md). The blueprint is `render.yaml`; the full-stack image is `Dockerfile.render`.

## Demo stack (Docker Compose)

```bash
docker compose up --build
```

Open `http://localhost:8080`.

The compose stack:

- `mongo:7` with a named volume and a healthcheck.
- The API image, which seeds demo data on boot and then starts the server.
- An nginx image serving the Vite build and proxying `/api` and `/uploads`.
- Sandbox payments, demo credentials and the local AI persona fallback.

This is a **demo** configuration. It runs the API with `NODE_ENV=development` so that HTTP localhost origins are allowed. Do not expose it to the public internet as-is.

To reset the demo data:

```bash
docker compose down -v
docker compose up --build
```

## Production topology

```
Client ── HTTPS ──> CDN / nginx
                      ├── /            -> frontend dist (SPA fallback)
                      ├── /api/*       -> Node API (2+ instances)
                      └── /uploads/*   -> shared object storage or API
                                            │
                         MongoDB (replica set, auth, TLS)
                         Redis (TLS, shared budgets)
                         Object storage (listing images)
                         AI provider (optional)
```

Put the frontend and API behind the same HTTPS origin. The web app uses an HttpOnly refresh cookie scoped to `/api/auth`; cross-site cookie and CORS configuration is intentionally strict.

### Required environment

See `backend/.env.example`. The important production values:

| Variable | Production requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | ≥32 random bytes, not a placeholder |
| `MONGO_URI` | Authenticated MongoDB, TLS in transit |
| `CORS_ORIGIN` | Explicit HTTPS origins, no wildcards |
| `APP_URL` | HTTPS public URL |
| `REDIS_URL` | `rediss://…` for shared rate limits (recommended for >1 instance) |
| `TRUST_PROXY` | Correct hop count or trusted proxy CIDR |
| `PAYMENTS_MODE` | `sandbox` only for an explicit demo |
| `ALLOW_SANDBOX_PAYMENTS` | `true` only if you accept that no real money moves |
| `ENABLE_AI` | `true` only with a provider key and privacy review |
| `HUGGINGFACE_API_KEY` | Provider key, billing limits enabled |
| `UPLOAD_DIR` | Writable persistent volume or mounted object storage |

The server refuses to start in production when the sandbox provider is enabled without `ALLOW_SANDBOX_PAYMENTS=true`, when CORS uses HTTP, when `APP_URL` is missing/non-HTTPS, or when the JWT secret is weak.

### Build and run

```bash
cd frontend && npm ci && npm run build
# serve dist/ with nginx; use frontend/nginx.conf as a starting point

cd ../backend && npm ci --omit=dev
NODE_ENV=production node src/server.js
```

Run at least two API instances behind the proxy for availability. Use Redis so that login/chat/booking budgets are shared. The in-memory budget fallback is per process and logs a warning in production.

### Database indexes and migrations

`server.js` creates the model indexes at boot. This is safe for a fresh deployment and for small collections. For an existing production database:

1. Review the index list (`scripts` or `model.indexes()`).
2. Create indexes in a maintenance window.
3. Keep the partial unique booking index — it is the last line of defence against double booking.
4. Plan schema changes rather than relying on Mongoose defaults for existing documents.

### Seed policy

`npm run seed` resets demo collections. It refuses to run with `NODE_ENV=production` unless `ALLOW_SEED_IN_PRODUCTION=true` is set. Never seed a real production database.

### Uploads

Local uploads are JPEG-only, re-encoded, ≤5 MiB, ≤16 MP, and served from `/uploads/<ownerId>-<uuid>.jpeg`. For multi-instance deployments mount a shared volume or replace the storage service with object storage and signed URLs. Do not use the public upload directory for private images.

### Health checks

- `GET /api/health` — process liveness.
- `GET /api/ready` — Mongo connection and budget layer.
- Configure the load balancer to drain on `SIGTERM`; the server closes HTTP, budgets and Mongo gracefully.

### Backups and retention

- Back up MongoDB daily and test restores.
- Uploads and Mongo must be backed up together for listing consistency.
- Risk events expire after 120 days via TTL.
- Define a retention policy for audit events and financial records.
- Account deletion anonymises profile/booking contact data but retains financial rows; document this in the privacy notice.

### Observability

- JSON request logs include `requestId`, method, path, status and duration. Forward them to your log platform; do not enable debug logging of request bodies.
- Track `/api/ready`, 5xx rate, booking conflict rate, payment/refund failures, AI provider latency/error rate and the risk queue size.
- The audit trail is operational data, not a security information and event management (SIEM) system.

### Security checklist

- [ ] TLS everywhere; HSTS at the edge.
- [ ] Fresh JWT secret; no secrets in the repo.
- [ ] Mongo and Redis authenticated, not publicly exposed.
- [ ] CORS origins exact and HTTPS.
- [ ] `TRUST_PROXY` matches the actual proxy chain.
- [ ] Live payment provider integrated, or sandbox demo clearly labelled and not public.
- [ ] AI provider key has billing limits and a privacy review.
- [ ] Upload storage shared/backed up and not used for private data.
- [ ] Backups and restore drill completed.
- [ ] Error reporting configured (frontend and backend).
- [ ] Helplines localised and reviewed.
- [ ] Privacy notice and consent copy reviewed.
- [ ] On-call/escalation policy exists for the safety queue.
- [ ] `npm test`, `npm run build` and `npm audit` pass in CI.

### Known deployment limitations

- No live card processor.
- No email/SMS provider; notifications are in-app.
- No human-staffed 24/7 safety rota.
- No recurring merchant opening hours; availability is per date.
- No WebSocket/real-time layer; notifications poll.
- No automated data migration framework; index creation happens at boot.
