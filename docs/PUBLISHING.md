# Publishing PawCompanion

Short answer: **publish one clean public code repository, and keep a separate private repo only for deployment configuration and secrets.** Do not make a screenshot-only “showcase repo” that duplicates the code — it goes stale and looks less credible than a real, runnable product.

If you are not deploying yet, **one public repo is enough**. GitHub Environments/Secrets can hold the deployment values when you do deploy.

---

## Option A — recommended: public product repo + private deploy repo

```
paw-companion                 (public)   ← code, tests, demo seed, screenshots, docs
paw-companion-deploy          (private)  ← Terraform/k8s/compose overrides, real hosts, runbooks
```

The public repo is the portfolio: anyone can run it, read the architecture and see how the product works. The private repo contains only the things that should not be public:

| Public repo | Private deploy repo |
| --- | --- |
| Application source | Cloud account IDs, hostnames, DNS |
| Tests and demo seed data | Production database connection strings |
| Dockerfiles and local compose | Real provider keys (Stripe, Hugging Face) |
| Screenshots and docs | TLS certificates, secret manager references |
| Sanitised `.env.example` | Actual production `.env` values |
| Architecture decisions | Runbooks, on-call rotation, incident history |

The private repo should **reference image tags or artifacts** built from the public repo; it should not contain a second copy of the application.

A practical private layout:

```
paw-companion-deploy/
  terraform/
  k8s/ or fly/ or render/
  compose/
  .env.example          # names only, no values
  RUNBOOK.md
  RELEASE.md
```

## Option B — valid: one public repo

For a solo portfolio project, one public repo with GitHub Environments is simpler:

- `production` environment with required reviewers.
- Secrets stored in GitHub Actions, never in the repo.
- Deploy workflow builds and pushes the image, then deploys.
- A `demo` environment for the public sandbox demo.

This is less machinery and still safe if branch protection and secret scanning are on.

## Do not publish

- `.env` files, tokens, API keys, JWT secrets, database passwords.
- Production database dumps, uploads containing real people or animals.
- Real customer names, emails, phone numbers, addresses, chat or check-in content.
- Screenshots with browser chrome, tabs, bookmarks, local paths or notifications from your machine.
- Admin credentials that work against a deployed instance.
- Cloud account IDs, private hostnames, internal repo URLs.
- Personal email addresses in commit author metadata, unless you are comfortable publishing them.

The demo credentials in this repo are intentionally public and only work against the local seeded demo. They are documented as such. The compose JWT secret and Mongo password are local demo values, not production credentials, and are allowlisted in `.gitleaks.toml`.

## Privacy checklist

Run this before making the repo public:

```bash
git status
git ls-files | sort
npm run check:privacy
```

Then check:

- [ ] `.env`, `uploads/`, `.cache/`, `node_modules/`, `dist/`, database dumps are ignored and not tracked.
- [ ] No absolute home paths, personal usernames or localhost-only machine names in source or docs.
- [ ] No provider keys, private keys or live payment keys in tracked files or Git history.
- [ ] Demo identities are fictional; emails use `example.com` / the project’s own domain.
- [ ] Screenshots use the demo account, contain no browser chrome and no real personal data.
- [ ] `git log -1 --format='%an <%ae>'` shows an author identity you are willing to publish. Use a GitHub noreply address or a project identity if not.
- [ ] GitHub secret scanning, Dependabot and branch protection are enabled after publishing.
- [ ] `SECURITY.md` has a private reporting path.
- [ ] The README states what is demo, what is sandboxed and what is not production-ready.

If a real secret was ever committed, **rotate it first**, then clean history. Removing the file is not enough. Do not rewrite public history casually; coordinate with anyone who cloned it.

## Deploying the public demo

A credible portfolio link is a deployed demo, not a screenshot.

1. **Database:** MongoDB Atlas free/shared tier, separate database `pawcompanion-demo`, restricted network access.
2. **API:** Render/Fly.io/Railway container from `Dockerfile.render`; set `NODE_ENV=production`, HTTPS `CORS_ORIGIN`, `APP_URL`, a fresh `JWT_SECRET`, `PAYMENTS_MODE=sandbox`, `ALLOW_SANDBOX_PAYMENTS=true` only for the demo, and a provider key/model for chat. There is no production keyword fallback.
3. **Web:** Vercel/Netlify/Cloudflare Pages from `frontend/`, with `VITE_API_URL` pointing at the HTTPS API if it is on another origin. If the API is on another origin, configure cookies/CORS carefully; same-origin is simpler.
4. **Seed:** run the seed once against the demo database, then disable the seed command in that environment.
5. **Label it:** add a “Demo” badge and a line that payments are sandboxed and data is reset periodically.
6. **Protect it:** rate limits, Redis if available, a budget alert at the provider, and no real user signups in the demo copy.

If you use a separate API origin, test login/refresh, image URLs and CORS in a private window before sharing the link.

## App store? (out of scope)

The product decision is **responsive web + installable PWA**. There is no native shell, and App Store / Play Store distribution is intentionally not planned.

That is enough for a portfolio link and a beta. Put the web demo online first.

If that decision ever changes, the prerequisites would be:

- live payments (or a clear free-beta model) and store-compliant billing;
- email verification, password reset and account deletion that satisfies store policy;
- privacy policy, terms, safety disclosures and data-retention description;
- 24/7-ish safety escalation or a product scope that does not imply crisis support;
- native shell (Capacitor/Expo or Trusted Web Activity), push notifications, offline states;
- review of the AI/mental-health claims with legal counsel.

## Portfolio presentation

When the public repo is ready:

- Pin it on your GitHub profile.
- Add topics: `react`, `express`, `mongodb`, `pwa`, `companionship`, `safety-by-design`, `full-stack`.
- Put the live demo link and the case study at the top of the README.
- Keep 6–8 curated screenshots; link the rest instead of loading everything.
- Include one paragraph on what you would do differently — reviewers trust that more than a perfect story.
- Do not claim real users, revenue or clinical validation.

## Suggested release flow

```
feature branch → tests + build + privacy check
→ PR to main (screenshots if UI)
→ tag v2.x
→ deploy workflow (private env / GitHub Environment)
→ smoke test the deployed demo
→ update README live link if needed
```

The repository is already structured for this: `npm test`, `npm run build`, `npm run e2e` and `npm run check:privacy` are the gates.
