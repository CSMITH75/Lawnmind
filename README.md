# 🌿 LawnMind

AI-powered lawn care companion — weekly plans, hyper-local weather intelligence, and a
conversational agent. Implementation of [LawnMind PRD v1](<./LawnMind PRD v1.docx>).

Two packages:

| Package   | What it is |
|-----------|------------|
| `app/`    | Expo (React Native) client — **iOS, Android, and web** from one codebase. The web target means every feature is testable in a browser, no simulator needed. |
| `server/` | Fastify API — PlanGen engine, Claude chat agent, Open-Meteo weather proxy, affiliate redirect. Holds all secrets; the client ships none. |

## Quick start (test it in the browser)

```bash
npm run setup        # installs server/ and app/ deps

# Terminal 1 — API server (port 3001)
npm run dev:server

# Terminal 2 — web app (port 8081)
npm run dev:web
```

Open http://localhost:8081 — complete the 90-second onboarding and you'll get your Week 1 plan.

**No API keys required to test.** Without `ANTHROPIC_API_KEY` the chat agent answers from a
deterministic offline responder (clearly labeled in the UI); without internet, the weather
layer serves a seasonal fallback forecast and the app shows a stale-data indicator. To enable
live Claude responses:

```bash
cd server && cp .env.example .env   # set ANTHROPIC_API_KEY=sk-ant-...
```

For iOS/Android: `npm run dev:app`, then scan the QR with Expo Go. On a physical device set
`EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3001` so the app can reach the API.

## What's implemented (Phase 1 / MVP scope)

- **Onboarding** — ZIP → climate zone detection, lawn snapshot, regional grass picker, first plan
- **Weekly plan (Home)** — 2–4 prioritized task cards with plain-English rationale, deep dives,
  time estimates, one affiliate product chip per card, mark-complete, 7-day weather strip,
  lawn health gauge, quick-ask bar
- **PlanGen v1** — deterministic scoring over a seeded regional treatment calendar
  (PRD Appendix A) gated by live soil temperature and forecast; no model call, fully reproducible
- **AI chat (Ask)** — Claude (Sonnet) with the PRD §9 system prompt and per-call user-context
  block (profile + current plan + forecast); server-side key, prompt caching on the system
  block, bounded history
- **My Lawn** — profile card + treatment history (auto-logged from completed tasks)
- **Explore** — regrowth plan previews (free tier teaser) + curated product catalog
- **Offline support** — plan, profile, history, and recent chat cached locally
  (AsyncStorage/localStorage); stale-data indicators when disconnected

Deferred to Phase 2 per the PRD: push notifications, photo diagnosis, RevenueCat subscriptions,
full regrowth plan generation, USDA soil lookup.

## Hardening & performance

**Server**
- Helmet security headers; CORS restricted to an explicit origin allowlist
- Global + per-route rate limits (chat is tighter, per PRD §9.2 cost guardrails)
- Every input validated with zod; uniform error envelope — stack traces and internals never
  reach the client
- Affiliate redirect resolves `productId` against the server-side catalog **only** — client
  URLs are never followed, so it can't be abused as an open redirect
- 64KB body limit, outbound fetch timeouts, env validated at boot (fails fast)
- Secrets live only in server env; `/api/products` strips partner URLs

**Performance**
- Weather responses cached in-memory on an ~11km coordinate grid (nearby users share entries),
  TTL configurable; stale-cache fallback when the upstream is down
- PlanGen is pure computation — no model call per plan, plans cost nothing to regenerate
- Claude system prompt uses prompt caching; chat history bounded to 10 turns
- Client caches plan locally and refreshes in the background on launch

## Commands

```bash
npm test             # server unit + API tests (vitest)
npm run typecheck    # strict TS across both packages
npm run build:web    # static web export (app/dist)
```

CI (GitHub Actions) runs typecheck + tests + a web export on every push/PR.

## Configuration

See [`server/.env.example`](server/.env.example). Client-side, only
`EXPO_PUBLIC_API_URL` matters (defaults to `http://localhost:3001`).

## Notes & v1 shortcuts

- ZIP → coordinates uses an embedded prefix table (no geocoder dependency); swap for GPS +
  reverse geocoding when location permissions land.
- The PRD pins `claude-sonnet-4-20250514`, which is deprecated — the server defaults to
  `claude-sonnet-4-6` (override with `ANTHROPIC_MODEL`).
- Persistence is client-local for now; the PRD's PostgreSQL/Redis layer comes with accounts.
