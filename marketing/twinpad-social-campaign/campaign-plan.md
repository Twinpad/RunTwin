# TwinPad Social Campaign Plan

**Campaign:** "One Launchpad. Two Routes." — 15 posts / 15 banners
**Goal:** introduce TwinPad to the Solana community, explain the dual-route launchpad, showcase verified technology, highlight honest data practices, and build anticipation — without invented claims.

## Positioning
TwinPad is **one destination** for Solana's two big launch ecosystems:
- **Path 01 — Pump.fun** (bonding curve → PumpSwap)
- **Path 02 — Raydium LaunchLab** (bonding curve → Raydium CPMM)

The campaign voice: fun, professional, confident, community-first. No financial promises, no invented features, no fake numbers — TwinPad's own product copy already commits to "verified or N/A", and the campaign inherits that voice.

## Message arc
| Stage | Tweets | Job |
|---|---|---|
| Land | 01, 02 | What TwinPad is + the two-route idea |
| Prove | 03, 04, 06, 13 | Each route explained + real tech + honest infrastructure |
| Show | 05, 07, 12 | Discovery, live activity, the experience |
| Connect | 08, 09, 10, 14 | Creators, differentiation, community-first benefits |
| Look ahead | 11, 15 | Verified next steps + the closing vision |

## Verified claims behind the copy
Every technical statement in the tweets was checked against the codebase:
- **Dual routes** — `@pump-fun/pump-sdk` 4.0.0 and `@raydium-io/raydium-sdk-v2` 0.2.74-alpha adapters; route presets in the create flow.
- **Discovery** — five live sources: `pumpfun.curve`, `pumpfun.pool`, `launchlab.curve`, `raydium.cpmm`, `twinpad` registry (visible in the Explore UI).
- **Trending** — PumpPortal-powered live engine with on-chain trade verification and rolling windows; in-product copy confirms "24h history completes as data accumulates".
- **Live activity** — launch timeline from the registry lifecycle (prepare → confirm → curve → graduation → pool verified) plus market pulse and verified new pairs.
- **RPC/Alchemy** — server-side `/api/rpc` gateway: rate limiting, caching, request coalescing, circuit breaker, 429 backoff; Alchemy is the configured provider.
- **PumpPortal** — keyless tier running in production (creations + migrations); funded tier optional.
- **Pinata/IPFS** — uploads via `/api/upload`, working credentials verified.
- **No-custody** — transactions built server-side, signed client-side by the wallet owner; `docs/VERIFICATION.md` states the platform does not claim to construct transactions without the user.
- **Honesty features** — degraded feeds serve cached data or explicit N/A with a visible "provider issue" banner; never fabricated figures.

## Deliberately NOT claimed
- No rewards, points, airdrops, or token incentives — **none are implemented** (source scan; `holderReward: false` in the pump adapter). Tweet 10 is a community-benefits post; an optional future rewards variant is stored in `tweets.md` behind an explicit approval gate.
- No "first/only" claims, no launch dates, no token addresses, no official handles.
- Tweet 11 teases only verifiable work-in-progress items.

## Visual system
All 15 banners share the TwinPad design system: deep indigo `#170B45/#201060` stage, lagoon teal `#2CD4C0` (ring 01 / Pump.fun), orchid `#D848F0` (ring 02 / LaunchLab + "Pad"), spark gold `#F8CC14`, sky cyan `#68E8F8`, Baloo 2 display type + Nunito text, starfields, halo ellipses and the twin-ring motif from the official artwork. The official logo PNG is embedded unmodified in every banner.

## Rollout suggestion
One post per day in numerical order over ~2 weeks. Best engagement windows: Tue–Thu. Keep replies active for 24h after each post. Re-run Tweet 11's question format whenever a real roadmap item ships.
