# Public repository privacy audit

Date: 2026-11-08
Repository: `Mike-Animal-Counseling/paw-companion` (public)

## Scope

- all tracked files
- Git history
- screenshots and image metadata
- GitHub secret scanning and code scanning
- local runtime artifacts that could be accidentally committed

## Result

| Check | Result |
| --- | --- |
| Tracked files | 292 |
| `npm run check:privacy` | pass |
| GitHub secret scanning | **0 open alerts** |
| GitHub code scanning | 1 medium, reviewed and dismissed |
| Screenshot EXIF / XMP | none |
| Tracked `.env` files | only `.env.example` |
| Tracked uploads/cache/dist | none |
| Local absolute paths in history | none found |
| Real provider keys in history | none found |

## What was checked

- Windows/macOS home paths, download-folder paths, local usernames
- GitHub, Hugging Face, Stripe, AWS and private-key patterns
- credential-bearing Mongo URIs
- hard-coded JWT/session secrets
- personal email addresses and phone numbers
- image EXIF/XMP and embedded comments
- GitHub Actions workflow secrets
- commits across all branches, not just `HEAD`

## Findings and dispositions

1. **Demo accounts are intentionally public.** `maya@example.com`, `hello@willowandwhiskers.example`, `admin@pawcompanion.app` and the seed passwords are synthetic demo credentials. They are not production accounts. A public demo must never reuse these passwords with real data.
2. **Historical placeholders are not secrets.** An older commit contained a credential-shaped Mongo URI with the literal words `USER` and `PASSWORD`, plus a Hugging Face token placeholder. Secret scanning confirms no real credential. The current docs use a non-credential cluster example.
3. **CodeQL `js/http-to-file-access` (medium).** The merchant sound upload writes a validated audio buffer to a generated filename. The alert was reviewed and dismissed with the rationale: authenticated owner, 2 MB limit, MIME/duration validation, generated filename, owner-scoped deletion, static serving with CSP. It is an intentional upload sink, not a path traversal.
4. **Screenshots contain only synthetic demo data.** The partner form screenshot shows the demo partner email; no real host, guest or address data.
5. **Local audit artifacts are outside Git.** The private repo-list and audit outputs were moved to a local folder outside the checkout; any locked remainder is ignored via `.git/info/exclude`. None of it is tracked or included in the public repository. The tracked working tree is clean.

## Residual risks

- Public demo credentials are shared; use a disposable database only.
- Host-uploaded sounds must have documented rights; see [SOUND_CREDITS.md](SOUND_CREDITS.md).
- The free Render demo uses ephemeral local uploads and a reseeded database.
- This audit is not a substitute for a paid secret scanner, a legal review or a penetration test.

## Re-run

```bash
npm run check:privacy
git log --all -S 'C:\\Users'
gh api repos/Mike-Animal-Counseling/paw-companion/secret-scanning/alerts?state=open
```
