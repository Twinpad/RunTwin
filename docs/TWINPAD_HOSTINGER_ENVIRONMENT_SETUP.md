# TwinPad on Hostinger — Production Environment Setup (Mainnet)

**Audited against the current source code** (full scan of `src/`, `prisma/`,
`next.config.mjs`, `package.json`, `.env.example`, `.env`, `.env.local` names),
not against older deployment notes. This document supersedes
`docs/HOSTINGER_ENVIRONMENT_SETUP.md`, which predates the RPC-gateway
variables and the current Hostinger Web-Apps hosting model.

- Target: **Hostinger Node.js web app (hPanel "Web Apps")**, Solana **Mainnet**
- Stack: Next.js 15 (server mode), Node.js ≥ 20, Prisma + **SQLite** (unchanged)
- Audit date: 2026-11-09

> Security rules honored by this document: no secret values are printed, no
> credentials are invented, `.env.local` is never modified or committed, and
> no private keys or seed phrases are ever requested. Every variable below was
> verified against a real code reference or verified as unused.

---

## 1. How environment variables work on Hostinger

Verified against Hostinger's Node.js documentation (`docs.hostinger.com/node.js`):

- Variables are managed in **hPanel → Websites → (your app) → Environment
  variables**, or during onboarding on the deploy-settings screen. You can add
  them one by one or **bulk-import a `.env` file** (comments skipped, quotes
  stripped). Names must be `A–Z 0–9 _` only.
- Values are injected into **both the build and the running app**, are stored
  encrypted server-side, and **persist across deployments** — set them once.
- **Saving environment variables triggers a redeploy**, so new values take
  effect everywhere.
- **`NEXT_PUBLIC_*` values are inlined into the client bundle at build time.**
  They must be set **before the build that uses them** (i.e., before the first
  deploy, and every change requires a rebuild — Hostinger does this
  automatically when you save).
- Server-only variables are read from `process.env` at **runtime** by the
  Node process; no rebuild is needed (a restart/redeploy applies them).
- Do **not** ship `.env` / `.env.local` in the repository. Hostinger keeps its
  own protected env file per app; local files are for development only.

### Hostinger platform facts that affect TwinPad

| Fact | Implication for TwinPad |
|---|---|
| Next.js apps always run in **server mode**; Hostinger starts the server automatically (no entry file needed) | Deploy TwinPad as a `next` app; `npm run build` + auto-start. No `PORT` variable needed. |
| **Apps run on demand**: after a period without traffic the process is **stopped**, and the next request starts it again | The PumpPortal live poller, treasury indexer and SSE streams only run **while the process is alive**. After an idle stop they resume on the next request; in-memory trending stats reset on each cold start. SSE connections keep the process alive while clients are attached. If you need always-on polling, use a Hostinger **VPS** instead. |
| Each deployment builds into a **new** `~/domains/{domain}/hbuilds/versions/{build-id}` folder and **older builds are deleted** after each successful deployment | **Any file the app writes inside the build folder is destroyed on redeploy.** This is why `DATABASE_URL` must point to an absolute path **outside** `hbuilds/` and `public_html/` (see §5). |
| Build steps (dependency install, build script) each have a **15-minute limit** | TwinPad's install + build fit comfortably; keep devDependencies installed (they are needed to build). |
| `package.json` has `"postinstall": "prisma generate"` | The Prisma client is generated automatically during install on Hostinger. |
| Supported Node versions: 18 / 20 / 22 / 24 (22 default; LTS recommended) | TwinPad requires ≥ 20. Pick **22** (or 20). |
| Plans with the panel flow: **Business Web Hosting, Cloud Startup/Professional/Enterprise/Enterprise Plus**; VPS/dedicated also run Node.js but with manual CLI setup | On a VPS you manage the process yourself (pm2/systemd) and the disk is fully persistent — the simplest SQLite story. |

---

## 2. Complete environment-variable checklist

Classifications: **REQUIRED** — production breaks or a core feature 503s
without it. **FEATURE** — required only when that feature is enabled.
**OPTIONAL** — safe to omit (sensible code defaults exist). **BUILD** —
`NEXT_PUBLIC_*`, inlined at build time. **SECRET** — server-only, never
expose via `NEXT_PUBLIC_*`. **DO NOT SET** — obsolete or platform-injected.

| Variable | Required? | Production value | Purpose (verified reference) | Secret? |
|---|---|---|---|---|
| `NEXT_PUBLIC_TWINPAD_NETWORK` | **REQUIRED · BUILD** | `mainnet-beta` | The **only** network variable read anywhere (`src/lib/network-env.ts`); anything else → devnet. Selects the cluster for client and server. | No (public) |
| `NEXT_PUBLIC_APP_URL` | **REQUIRED · BUILD** | `https://your-domain` | `metadataBase` origin for SEO/OG URLs (`src/app/layout.tsx`). Unset → falls back to `http://localhost:3300` → broken share previews in production. | No (public) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | **REQUIRED** (recommended setup) · BUILD | `/api/rpc` | Browser wallet + launch-flow RPC (`wallet-providers.tsx`, `create/page.tsx`). `/api/rpc` = TwinPad's own server-side proxy; the relative path is absolutized against the page origin. | No (path only — never put a credentialed URL here) |
| `ALCHEMY_SOLANA_RPC_URL` | **REQUIRED** (proxy + server reads) | `https://solana-mainnet.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>` | Dedicated Alchemy endpoint: browser-proxy upstream (`src/app/api/rpc/route.ts` — **503 `rpc_proxy_not_configured` without it**) and first choice for all server-side reads (`src/lib/connection.ts`, gateway `resolveUpstreamUrl`). | **YES — server-only** |
| `DATABASE_URL` | **REQUIRED** (registry + treasury persistence) | `file:/home/<uXXXX>/domains/<domain>/data/twinpad.db` — **absolute, outside `hbuilds`** (see §5) | Prisma SQLite (`prisma/schema.prisma`). Unset → launch registry & treasury routes return honest 503s (`src/lib/db.ts`); core launch flow still works. | Server-only (not a credential; keep server-side) |
| `PINATA_JWT` | **FEATURE** (artwork uploads) — strongly recommended for a launchpad | `<Pinata JWT>` | IPFS upload of artwork/metadata (`src/app/api/upload/route.ts`). Unset → upload endpoint returns 503 `upload_not_configured`; launching without artwork still works. | **YES — server-only** |
| `PINATA_GATEWAY` | OPTIONAL (recommended) | `yourgateway.mypinata.cloud` (host only, no scheme) | Gateway host used to display/resolve IPFS assets; default `ipfs.io`. | No |
| `ALCHEMY_API_KEY` | OPTIONAL | `<YOUR_ALCHEMY_KEY>` | Alternative to the full URL: the server derives `https://solana-<net>.g.alchemy.com/v2/<key>`; also derives the WS URL. Unneeded when `ALCHEMY_SOLANA_RPC_URL` is set. | **YES — server-only** |
| `ALCHEMY_SOLANA_WS_URL` | OPTIONAL (future use) | `wss://solana-mainnet.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>` | WebSocket endpoint for subscriptions — **not used by any current feature**; auto-derived from `ALCHEMY_API_KEY` when the Alchemy provider is active. | **YES — server-only** |
| `SOLANA_RPC_URL` | OPTIONAL | `https://<your-provider>/v2/<key>` | Generic custom server-side RPC — used only when Alchemy is not configured; otherwise the public cluster endpoint is the fallback. | Server-only (if it embeds a key) |
| `TWINPAD_OFFICIAL_ENABLED` | **FEATURE** (official $TWIN section + treasury dashboard) | `true` only when launching the official section; otherwise leave **unset/empty** (default **off**) | Master switch, read server-side (`src/lib/official-token/config.ts`); accepts `true`/`1`. | No (public data) |
| `TWINPAD_OFFICIAL_CREATOR_WALLET` | FEATURE (with the above) | `<W1 base58 address>` | W1 — official $TWIN creator-fee receiver. Base58-validated; invalid values are surfaced as misconfiguration. | No (public address) |
| `TWINPAD_OFFICIAL_BUYBACK_TREASURY` | FEATURE (with the above) | `<W2 base58 address>` | W2 — dedicated buyback treasury. | No |
| `TWINPAD_OFFICIAL_OPS_TREASURY` | OPTIONAL (role W3) | `<W3 base58 address>` | W3 — operations & reserve treasury. Unset roles render an honest "configuration needed" state. | No |
| `TWINPAD_OFFICIAL_DEV_WALLET` | OPTIONAL (role W4) | `<W4 base58 address>` | W4 — development wallet (transparency listing only). | No |
| `TWINPAD_OFFICIAL_MINT` | **FEATURE** — must stay **EMPTY until a verified official mint exists** | *unset* (see §4) | The official $TWIN mint is read **exclusively** from this variable — no legacy fallback anywhere. | No |
| `TWINPAD_OFFICIAL_NETWORK` | OPTIONAL | `mainnet-beta` | Per-feature network override; falls back to `NEXT_PUBLIC_TWINPAD_NETWORK`. | No |

| `PUMPPORTAL_API_KEY` | OPTIONAL | `<PumpPortal API key>` | Funded PumpPortal tier streams per-token trades directly. Without it the **keyless tier** works and trades are sourced via on-chain RPC polling (`src/lib/pump-live/engine.ts`). | **YES — server-only** |
| `PUMP_LIVE_MAX_TOKEN_SUBS` | OPTIONAL | `300` (default) | Max tokens the live engine tracks. | No |
| `PUMPPORTAL_TRADE_POLL_MS` | OPTIONAL | `12000` (default) | Base cadence (ms) for keyless trade polling; adapts up under rate limiting. | No |
| `PUMP_LIVE_ROUND_CALL_BUDGET` | OPTIONAL | `48` (default) | Hard cap on upstream RPC calls per poll round (429 protection). Present in code, **not yet in `.env.example`**. | No |
| `RPC_GATEWAY_RATE_RPS` | OPTIONAL | `8` (default) | Primary-pool token-bucket rate (rps) for the shared RPC gateway. Tuned for one Alchemy key — raise only if your plan allows. | No |
| `RPC_GATEWAY_BURST` | OPTIONAL | `16` (default) | Primary-pool burst size. | No |
| `RPC_GATEWAY_CONCURRENCY` | OPTIONAL | `6` (default) | Primary-pool max in-flight upstream requests. | No |
| `RPC_GATEWAY_OPEN_BASE_MS` | OPTIONAL | `15000` (default) | Base duration for the gateway circuit breaker. | No |
| `RPC_GATEWAY_PUBLIC_RPS` | OPTIONAL | `5` (default) | Dedicated throttled pool for public-cluster fallback reads (discovery scans). | No |
| `RPC_GATEWAY_PUBLIC_BURST` | OPTIONAL | `10` (default) | Public-pool burst. | No |
| `RPC_GATEWAY_PUBLIC_CONCURRENCY` | OPTIONAL | `3` (default) | Public-pool max in-flight. | No |
| `RPC_GATEWAY_STALE_MAX_MS` | OPTIONAL | `600000` (default) | Max age of a cached value that may be served stale during rate limiting / outages. | No |
| `NODE_ENV` | Platform-managed — **do not set** | `production` (set by the platform / Next) | Runtime mode; also selects Prisma log levels. | — |
| `VERCEL_PROJECT_PRODUCTION_URL` | **DO NOT SET on Hostinger** | — | Vercel-injected SEO-origin refinement (`src/app/layout.tsx`). On Hostinger it is never set; if you set it manually it would **override** `NEXT_PUBLIC_APP_URL` in metadata — leave it out. | — |

### Obsolete / unused variables — do NOT configure these

Verified: **zero code references** in the current source.

| Variable | Status | Note |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | **Obsolete** | App name is fixed ("TwinPad") in `src/app/layout.tsx`. Present in `.env.example`/`.env.local` but never read. |
| `PUMP_LIVE_ENABLED` | **Obsolete** | Listed in `.env.example` but never read by the engine. The engine always starts with its features; there is no kill-switch variable. |
| `UPLOAD_MAX_BYTES` | **Obsolete** | The artwork cap is fixed at **10 MB in code** (`ARTWORK_CONSTRAINTS.maxBytes`, `src/lib/metadata.ts`) and is explicitly **not** env-configurable. |
| `POSTGRES_DATABASE_URL` | **Unused** | Referenced only by prose in `.env.example` (the PostgreSQL option). TwinPad stays on SQLite; the code reads `DATABASE_URL` only. |
| `VERCEL_OIDC_TOKEN` | **Never configure** | Vercel runtime artifact that leaked into `.env.local`. Not read by app code; meaningless (and rotation-sensitive) on Hostinger. Consider removing it from `.env.local` locally. |

---

## 3. Where to obtain each value, and exact formats

| Variable | Where to obtain | Expected format |
|---|---|---|
| `NEXT_PUBLIC_TWINPAD_NETWORK` | Your deployment decision (target: Mainnet) | Literal `mainnet-beta` (any other value → devnet) |
| `NEXT_PUBLIC_APP_URL` | Your Hostinger domain (Websites → Domain) | Absolute URL incl. scheme: `https://your-domain.tld` — no trailing slash needed |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | None — use the built-in proxy | Literal `/api/rpc` (relative path; absolutized against the site origin) |
| `ALCHEMY_SOLANA_RPC_URL` | alchemy.com dashboard → Apps → **Solana → Mainnet** → copy the HTTPS endpoint | `https://solana-mainnet.g.alchemy.com/v2/<key>` (`<key>` = 32 hex chars). Never print or commit it. |
| `ALCHEMY_API_KEY` (if used instead) | Same Alchemy app page | The key alone (32 hex chars) |
| `ALCHEMY_SOLANA_WS_URL` (if used) | Same Alchemy app page → WSS endpoint | `wss://solana-mainnet.g.alchemy.com/v2/<key>` |
| `SOLANA_RPC_URL` (if used) | Your RPC provider's dashboard | Full HTTPS URL, may embed its own key — server-only |
| `DATABASE_URL` | Your Hostinger account (see §5) | `file:` URL with an **absolute** Linux path: `file:/home/<uXXXX>/domains/<domain>/data/twinpad.db` |
| `PINATA_JWT` | pinata.cloud → API Keys → generate a JWT | Long `eyJ…` JWT string. Server-only. |
| `PINATA_GATEWAY` | Pinata → Gateways (dedicated gateway) | Bare host: `xxxxx.mypinata.cloud` (no `https://`, no trailing slash) |
| `TWINPAD_OFFICIAL_*` wallets | **You** — your own public Solana wallet addresses | Base58 ed25519 public keys (~32–44 chars). The app validates them and flags invalid ones on the dashboard. **Never** a private key or seed phrase. |
| `TWINPAD_OFFICIAL_MINT` | On-chain, **after** the official $TWIN token is launched and the mint is verified | Base58 SPL mint address. Empty/unset until then. |
| `PUMPPORTAL_API_KEY` | pumpportal.fun (if you fund the trade-streaming tier) | Opaque key string. Server-only. |

---

## 4. Official FLUX mint — the honest unconfigured state (preserve it)

- `TWINPAD_OFFICIAL_MINT` is read **exclusively** from that one variable
  (`src/lib/official-token/config.ts`). There is **no** legacy fallback: old
  RelayPad/DotPad mint values are **never** reused, and no placeholder address
  is ever substituted. The literal placeholder string
  `REPLACE_WITH_OFFICIAL_FLUX_MINT` is treated exactly like an unset value.
- **If the official mint is not configured** (currently the case — the
  variable is empty in `.env.local`):
  - The homepage official-token card and `/treasury` render their honest
    **"configuration needed / not announced yet"** states.
  - The official-token API routes operate in their disabled/unconfigured mode
    (the master switch `TWINPAD_OFFICIAL_ENABLED` also defaults to **off**).
  - Nothing crashes and no fabricated address is displayed.
- **Action for you:** leave `TWINPAD_OFFICIAL_MINT` unset (or empty) on
  Hostinger until the official $TWIN token is launched **and** the mint is
  verified on-chain. Then set it once (server-only, no rebuild required) —
  only if you also enable the feature with `TWINPAD_OFFICIAL_ENABLED=true`.
  Do not set either value "in advance".

---

## 5. SQLite on Hostinger — persistence requirements

**SQLite is fully supported** (Prisma `sqlite` provider + `file:` URL; the
app additionally self-heals a fresh database — `resolveSqliteUrl()` +
`ensureSqliteSchema()` apply `prisma/sqlite-bootstrap.sql` exactly once on
first DB access and record the init migration in `_prisma_migrations` so
`prisma migrate deploy` stays a no-op). No PostgreSQL switch is required or
recommended.

**The one hard requirement: the database file must live OUTSIDE the deploy
directory.** Hostinger deployments build into a new
`~/domains/{domain}/hbuilds/versions/{build-id}` folder, re-point the
`current` symlink, and **delete older build folders after every successful
deployment**. A database stored inside the app (any relative `file:` path —
they resolve to `<app>/prisma/...` or `<app>/...` per `resolveSqliteUrl()`)
would be **wiped on every redeploy**. Therefore:

1. In hPanel **File Manager**, confirm your home prefix (e.g.
   `/home/uXXXX/domains/your-domain/`) and create a data directory **next
   to** `hbuilds`/`public_html`, e.g. `~/domains/your-domain/data/`.
   (`resolveSqliteUrl()` does **not** create directories for absolute paths —
   create the folder yourself once.)
2. Set `DATABASE_URL=file:/home/uXXXX/domains/your-domain/data/twinpad.db`
   (absolute path, `file:` scheme, no quotes needed in the Hostinger UI).
3. **Verify persistence before trusting it** (Hostinger's docs do not
   explicitly guarantee persistence of arbitrary runtime-written paths):
   deploy → use the site to create one test launch record → confirm it
   appears → trigger a **Redeploy** → confirm the record still exists.
4. If the test record does **not** survive a redeploy, SQLite cannot safely
   persist on the panel web-app flow. Options in that case (in order):
   use a Hostinger **VPS** (fully persistent disk; run the same app with
   pm2/systemd and the same absolute `DATABASE_URL`), or ask Hostinger
   support which account path is excluded from deployment cleanup.

**Confirm in hPanel before setting `DATABASE_URL`:**

- The **exact home path** shown in File Manager (`/home/<uXXXX>/...`) — do
  not guess the username segment.
- That the data directory is writable by the app (it runs as your hosting
  user in the panel flow).
- That **Hostinger backups** cover the data directory (hPanel backups are
  account-wide), or schedule your own periodic copy of the `.db` file.

**Prisma during deployment:** `prisma generate` runs automatically via the
package.json `postinstall` hook. Migrations (`prisma migrate deploy`) are
**optional** — the runtime self-bootstrap handles a fresh database — but the
panel build flow has no interactive shell step, so run migrations explicitly
only from a local/CI step or on a VPS over SSH.

---

## 6. Deployment steps (Hostinger hPanel, Node.js Web App)

1. **Plan check** — confirm your plan supports Node.js web apps (Business
   Web Hosting, or Cloud Startup and above). A VPS uses the manual CLI flow
   instead (fully persistent disk — simplest SQLite story).
2. **Push-ready repo** — the GitHub repo must contain `package.json`,
   `prisma/schema.prisma`, `prisma/sqlite-bootstrap.sql` and
   `prisma/migrations/` (the runtime bootstrap reads them from
   `process.cwd()`) — and **must not** contain `.env.local` or any secrets.
3. **Create the app** — hPanel → Websites → Add Website → **Node.js web app**
   → Connect GitHub → select the TwinPad repository and branch.
4. **Set environment variables FIRST** (on the deploy-settings screen, or
   Websites → app → Environment variables): at minimum the five required
   variables from §2, plus any optional/feature variables you want. They must
   exist **before the build** so `NEXT_PUBLIC_*` values are inlined correctly.
5. **Build settings** (most are auto-detected):
   - Application type: `next` (auto) — server mode, no entry file.
   - Node.js version: **22** (LTS; ≥ 20 required by `engines`).
   - Root directory: `/`.
   - Install command: `npm ci --legacy-peer-deps` (the project has a
     documented peer-dependency conflict and no `.npmrc`).
   - Build script: `build` (→ `next build`).
   - Output directory: `.next`.
   - Package manager: npm.
6. **Prepare the SQLite data directory** (§5 step 1) and point `DATABASE_URL`
   at the absolute path inside it.
7. **Deploy.** Watch the build log (15-minute cap per step). On success the
   app starts automatically and keeps running (on demand — see §1).
8. **Verify** with the checklist below. Restart the app from the **Running**
   badge if needed. Runtime Logs show server stdout/stderr (including the
   `[db]` bootstrap lines).

### Post-deploy verification checklist

- [ ] `https://your-domain/` returns 200 and the homepage renders.
- [ ] Header shows **GitHub → https://github.com/Usetwinpad** and
      **X → https://x.com/TwinPadFun** (both open in a new tab).
- [ ] Share/OG preview resolves against your domain (`NEXT_PUBLIC_APP_URL`).
- [ ] The site identifies as **Mainnet** (network indicator).
- [ ] `GET /api/rpc/stats` returns `"healthy": true` — proves
      `ALCHEMY_SOLANA_RPC_URL` is configured and the gateway is live.
- [ ] Wallet connect works in the browser (RPC via `/api/rpc`, no 503).
- [ ] Create a test launch → appears in the registry → **redeploy** → record
      still present (SQLite persistence test, §5).
- [ ] Upload a small test artwork → succeeds (proves `PINATA_JWT`) — or
      returns the honest `upload_not_configured` 503 if intentionally omitted.
- [ ] Runtime Logs show no repeated `[db]` errors and no unhandled
      exceptions.
- [ ] Official $TWIN section shows its honest unconfigured state (while
      `TWINPAD_OFFICIAL_ENABLED` is not enabled).

---

## 7. Summary — what you must supply

**Must add in Hostinger (required):**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_TWINPAD_NETWORK` | `mainnet-beta` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.tld` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `/api/rpc` |
| `ALCHEMY_SOLANA_RPC_URL` | `https://solana-mainnet.g.alchemy.com/v2/<key>` |
| `DATABASE_URL` | `file:/home/<uXXXX>/domains/<domain>/data/twinpad.db` |

**Optional but recommended:** `PINATA_JWT` (+ `PINATA_GATEWAY`),
`ALCHEMY_SOLANA_WS_URL` (future use), `SOLANA_RPC_URL` (non-Alchemy
fallback), `PUMPPORTAL_API_KEY` (funded trade-streaming tier).

**Feature-gated (official $TWIN system):** `TWINPAD_OFFICIAL_ENABLED`,
`TWINPAD_OFFICIAL_CREATOR_WALLET`, `TWINPAD_OFFICIAL_BUYBACK_TREASURY`,
`TWINPAD_OFFICIAL_OPS_TREASURY`, `TWINPAD_OFFICIAL_DEV_WALLET`,
`TWINPAD_OFFICIAL_MINT` (**leave empty until a verified mint exists**),
`TWINPAD_OFFICIAL_NETWORK`.

**Optional tuning (sane defaults in code):** `RPC_GATEWAY_RATE_RPS`,
`RPC_GATEWAY_BURST`, `RPC_GATEWAY_CONCURRENCY`, `RPC_GATEWAY_OPEN_BASE_MS`,
`RPC_GATEWAY_PUBLIC_RPS`, `RPC_GATEWAY_PUBLIC_BURST`,
`RPC_GATEWAY_PUBLIC_CONCURRENCY`, `RPC_GATEWAY_STALE_MAX_MS`,
`PUMP_LIVE_MAX_TOKEN_SUBS`, `PUMPPORTAL_TRADE_POLL_MS`,
`PUMP_LIVE_ROUND_CALL_BUDGET`.

**Values only you can supply:** your production domain, the official wallet
addresses (W1–W4), the verified official mint when it exists, and the
decision to fund PumpPortal.

**Values from external providers:** Alchemy (RPC URL / key), Pinata
(JWT / gateway), PumpPortal (optional key).

**Do not add:** `NEXT_PUBLIC_APP_NAME`, `PUMP_LIVE_ENABLED`,
`UPLOAD_MAX_BYTES`, `POSTGRES_DATABASE_URL`, `VERCEL_OIDC_TOKEN`,
`VERCEL_PROJECT_PRODUCTION_URL`, `NODE_ENV`.

---

*End of document. Generated by a full source audit on 2026-11-09; re-run the
audit after any change that adds `process.env` usage.*







