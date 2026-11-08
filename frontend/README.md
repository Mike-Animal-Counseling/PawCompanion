# PawCompanion web

React 19 + Vite 8 + React Router 7. CSS Modules over a design-token system, route-level chunks and a mobile-first PWA shell.

## Scripts

```bash
npm ci
npm run dev       # http://127.0.0.1:3000, proxies /api and /uploads to :5000
npm run build     # production bundle in dist/
npm run preview   # preview the build
```

Environment (`.env.example`):

```ini
VITE_API_URL=
VITE_API_TARGET=http://127.0.0.1:5000
VITE_SHOW_DEMO_ACCOUNTS=false
```

Keep `VITE_API_URL` empty when the web app and API share an origin. The Vite proxy is development-only.

## Structure

```
src/
  App.jsx            providers, auth gate, error boundary
  AppRoutes.jsx      route map, role guards, lazy pages
  components/
    Layout/          Header, Footer, SiteLayout, ConsoleLayout, MobileTabBar, NotificationBell
    Auth/            AuthLayout, RequireAuth
    Home/            MemberHome
    Companions/      CompanionCard, FilterBar, ReviewList
    Chat/            ChatMessage
    Dashboard/       BarChart
    shared primitives Icon, Logo, Rating, Modal, Field, EmptyState, Feedback
  context/           Auth, Toast, Favorites
  hooks/             useFetch, useDebouncedValue, useDocumentTitle
  lib/               API client, formatting, constants
  pages/             public, guest, partner, operator
  styles/            tokens, base, shared UI
```

## Notes

- The access token lives in memory; the refresh token is an HttpOnly cookie. `lib/api.js` retries one 401 after a silent refresh.
- The auth gate waits for session restoration before mounting routes, so auth-aware public data (`relationship`, `isFavorite`) is correct on a hard reload.
- The production build must not include source maps; CI checks this.
- CSS: tokens in `src/styles/tokens.css`, shared primitives in `src/styles/ui.css`, page composition in `*.module.css`.
- Accessibility: labels, focus trapping in dialogs, `aria-*` on pickers/tabs, skip links and reduced-motion support.
- Service worker registration is production-only.

## Design references

- Product and flows: root [README](../README.md)
- Architecture: [Architecture.md](../Architecture.md)
- Screenshots: [docs/screenshots/v2](../docs/screenshots/v2)
