"use client";

/**
 * Homepage section set — real-data previews that link into the full pages.
 * Every fetch hits an existing backend endpoint with polling and honest
 * degraded states; nothing here fabricates market or activity data.
 *
 *  - TrendingUniversePreview → GET /api/trending (PumpPortal live engine)
 *  - LiveTicker              → GET /api/activity (registry lifecycle events)
 *  - LatestLaunchesPreview   → GET /api/launches (TwinPad launch registry)
 *  - LeaderboardTeaser       → GET /api/leaderboard (creator rankings)
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TokenImage, CurveProgressBar, type TokenRowData } from "@/components/dashboard/token-row";
import { RouteBadge } from "@/components/brand/route-badge";
import { Identicon } from "@/components/ui/identicon";
import { Icon } from "@/components/ui/icons";
import { timeAgo, shortAddress, formatCompact } from "@/lib/format";
import type { TrendingRow } from "@/lib/pump-live/types";

/* ------------------------------------------------------------------ */
/* Shared mini-card primitives                                         */
/* ------------------------------------------------------------------ */

function fmtUsd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "N/A";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n > 0) return `$${n.toPrecision(3)}`;
  return "$0";
}

function fmtChange(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "N/A";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function ChangeChip({ value, className = "" }: { value: number | null; className?: string }) {
  const na = value == null || !Number.isFinite(value);
  const up = !na && value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-mono text-2xs font-bold ${
        na ? "bg-night-800 text-night-500" : up ? "bg-up/12 text-up" : "bg-down/12 text-down"
      } ${className}`}
    >
      {!na && <Icon name="trending" size={11} className={up ? "" : "-scale-y-100"} />}
      {fmtChange(value)}
    </span>
  );
}

export function ArtRing({ children, size = 44 }: { children: React.ReactNode; size?: number }) {
  return (
    <span
      className="tp-tilt shrink-0 rounded-2xl bg-gradient-to-br from-violet-500/50 via-fuchsia-400/30 to-cyan-400/50 p-[2px] shadow-glow-mint"
      style={{ width: size + 4, height: size + 4 }}
    >
      <span className="block h-full w-full overflow-hidden rounded-[14px] bg-paper dark:bg-[#1D1442]">{children}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Trending universe preview                                        */
/* ------------------------------------------------------------------ */

function MiniTrendCard({ row, rank }: { row: TrendingRow; rank: number }) {
  return (
    <Link
      href={`/tokens/${row.mint}`}
      className="tp-tilt group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-night-700 bg-paper p-3.5 shadow-panel transition-all duration-300 hover:border-transparent hover:shadow-glow-mint"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400/25 to-violet-500/20 blur-xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-2.5">
        <span className="font-display text-2xs font-extrabold text-night-500">#{rank}</span>
        <ArtRing size={40}>
          <TokenImage imageUrl={row.imageUrl} symbol={row.symbol} size={40} />
        </ArtRing>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold text-ink">{row.name}</p>
          <p className="truncate font-mono text-2xs text-night-500">${row.symbol}</p>
        </div>
        {row.hot && (
          <span className="rounded-lg bg-orange-500/15 px-1.5 py-0.5 text-2xs font-extrabold text-orange-600 dark:text-orange-300">
            HOT
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-ink">{fmtUsd(row.priceUsd)}</span>
        <ChangeChip value={row.changePct} />
      </div>
      <div className="relative flex items-center justify-between text-2xs text-night-500">
        <span>
          Vol <span className="font-mono text-night-400">{fmtUsd(row.volumeUsd)}</span>
        </span>
        <span>
          MC <span className="font-mono text-night-400">{fmtUsd(row.marketCapUsd)}</span>
        </span>
      </div>
    </Link>
  );
}

function FeaturedTrendCard({ row }: { row: TrendingRow }) {
  return (
    <Link
      href={`/tokens/${row.mint}`}
      className="tp-tilt group relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#0E7490] p-6 text-white shadow-[0_24px_60px_-24px_rgba(109,40,217,0.65)]"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-fuchsia-500/25 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-2xs font-extrabold uppercase tracking-[0.14em] backdrop-blur-sm">
          <Icon name="flame" size={12} />
          Featured · Trending #1
        </span>
        {row.hot && (
          <span className="rounded-full bg-orange-400/90 px-2 py-0.5 text-2xs font-extrabold text-[#2A1E4F]">HOT</span>
        )}
      </div>
      <div className="relative flex items-center gap-4">
        <span className="rounded-3xl bg-white/15 p-[3px] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          <TokenImage imageUrl={row.imageUrl} symbol={row.symbol} size={72} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-extrabold">{row.name}</p>
          <p className="font-mono text-xs text-white/80">${row.symbol}</p>
          <p className="mt-1 truncate font-mono text-2xs text-white/60">{shortAddress(row.mint, 6)}</p>
        </div>
      </div>
      <div className="relative grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ["Price", fmtUsd(row.priceUsd)],
          ["Market cap", fmtUsd(row.marketCapUsd)],
          ["Volume", fmtUsd(row.volumeUsd)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-2xs text-white/65">{label}</p>
            <p className="font-mono font-bold">{value}</p>
          </div>
        ))}
        <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
          <p className="text-2xs text-white/65">24h</p>
          <p
            className={`font-mono font-bold ${
              row.changePct != null && row.changePct < 0 ? "text-rose-200" : "text-emerald-200"
            }`}
          >
            {fmtChange(row.changePct)}
          </p>
        </div>
      </div>
      <div className="relative flex items-center justify-between text-2xs text-white/70">
        <span>
          {row.buys} buys · {row.sells} sells
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-white">
          Open in universe
          <Icon name="chevronRight" size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function TrendingUniversePreview() {
  const [rows, setRows] = useState<TrendingRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/trending?tab=trending&tf=1h&limit=4", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { rows: TrendingRow[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {rows === null ? (
        <>
          <div className="h-56 animate-pulse rounded-3xl bg-night-800/70" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-night-800/70" />
            ))}
          </div>
        </>
      ) : rows.length === 0 ? (
        <div className="col-span-full rounded-3xl border border-dashed border-night-600 bg-paper/60 px-6 py-12 text-center">
          <p className="font-display text-lg font-bold text-ink">The market is warming up</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
            {failed
              ? "The live trending feed is unreachable right now — retry shortly."
              : "No tokens have live trades in this window yet. Rankings appear as real trades stream in."}
          </p>
        </div>
      ) : (
        <>
          <FeaturedTrendCard row={rows[0]} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {rows.slice(1, 4).map((row, i) => (
              <MiniTrendCard key={row.mint} row={row} rank={i + 2} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Live ticker (registry lifecycle events)                          */
/* ------------------------------------------------------------------ */

interface ActivityEvent {
  id: string;
  kind: string;
  createdAt: string;
  launch: {
    id: string;
    name: string;
    symbol: string;
    route: string;
    status: string;
    mintAddress: string | null;
    imageUrl: string | null;
  };
}

const KIND_META: Record<string, { label: string; icon: string; tile: string }> = {
  intent_recorded: { label: "Launch prepared", icon: "clock", tile: "bg-night-800 text-night-400" },
  submitted: { label: "Submitted", icon: "zap", tile: "bg-cyan-400/15 text-cyan-600 dark:text-cyan-300" },
  confirmed: { label: "Confirmed", icon: "check", tile: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  curve_trading: { label: "Curve trading", icon: "trending", tile: "bg-mint-500/15 text-mint-600 dark:text-mint-300" },
  graduation_detected: { label: "Graduating", icon: "zap", tile: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
  pool_verified: { label: "Pool verified", icon: "check", tile: "bg-up/15 text-up" },
  failed: { label: "Failed", icon: "alert", tile: "bg-down/15 text-down" },
  unresolved: { label: "Unresolved", icon: "alert", tile: "bg-warn/15 text-warn" },
};

export function LiveTicker() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=8");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { events: ActivityEvent[] };
      setEvents(data.events);
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="rounded-3xl border border-night-700/70 bg-paper p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-500" />
          </span>
          Live activity
        </span>
        <Link href="/live" className="text-2xs font-bold text-mint-500 hover:underline">
          Step inside →
        </Link>
      </div>
      {events === null ? (
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 w-64 shrink-0 animate-pulse rounded-2xl bg-night-800/70" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="px-1 py-3 text-sm text-night-400">
          No launches recorded yet — the grid lights up as soon as creators start launching through TwinPad.
        </p>
      ) : (
        <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {events.map((ev) => {
            const meta = KIND_META[ev.kind] ?? { label: ev.kind, icon: "info", tile: "bg-night-800 text-night-400" };
            return (
              <li key={ev.id} className="w-64 shrink-0 snap-start">
                <Link
                  href={`/tokens/${ev.launch.mintAddress ?? ev.launch.id}`}
                  className="tp-tilt flex items-center gap-2.5 rounded-2xl border border-night-700 bg-night-850 p-2.5 transition-all duration-200 hover:border-mint-500/40"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tile}`}>
                    <Icon name={meta.icon} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-ink">
                      {meta.label}: <span className="text-mint-500 dark:text-mint-300">{ev.launch.name}</span>
                    </span>
                    <span className="block truncate font-mono text-2xs text-night-500">
                      ${ev.launch.symbol} · {timeAgo(ev.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Leaderboard teaser (top 3 creators)                              */
/* ------------------------------------------------------------------ */

interface LeaderRow {
  creatorWallet: string;
  launches: number;
  graduated: number;
}

export function LeaderboardTeaser() {
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard?metric=launches&limit=3");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { leaderboard: LeaderRow[] };
      setRows(data.leaderboard);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const medals = ["from-yellow-400 to-amber-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];

  return (
    <div className="rounded-3xl border border-night-700/70 bg-paper p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
          <Icon name="trophy" size={16} className="text-mint-500" />
          Creator podium
        </span>
        <Link href="/leaderboard" className="text-2xs font-bold text-mint-500 hover:underline">
          Full rankings →
        </Link>
      </div>
      {rows === null ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-night-800/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-1 py-3 text-sm text-night-400">
          No creator rankings yet — the podium fills up as launches roll in.
        </p>
      ) : (
        <ol className="grid grid-cols-3 gap-2">
          {rows.map((row, i) => (
            <li key={row.creatorWallet}>
              <Link
                href={`/tokens?creator=${row.creatorWallet}`}
                className="tp-tilt group flex flex-col items-center gap-2 rounded-2xl border border-night-700 bg-night-850 p-3 text-center transition-all duration-200 hover:border-mint-500/40"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${medals[i]} font-display text-xs font-extrabold text-[#2A1E4F] shadow-glow-mint`}
                >
                  {i + 1}
                </span>
                <Identicon value={row.creatorWallet} size={36} />
                <span className="w-full truncate font-mono text-2xs text-night-400">
                  {shortAddress(row.creatorWallet, 4)}
                </span>
                <span className="rounded-lg bg-sky-100/70 px-2 py-0.5 text-2xs font-bold text-mint-700 dark:bg-sky-100/10 dark:text-mint-300">
                  {row.launches} 🚀
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Latest launches preview (collectible grid)                       */
/* ------------------------------------------------------------------ */

export function LaunchMiniCard({ token }: { token: TokenRowData }) {
  const href = `/tokens/${token.mintAddress ?? token.id}`;
  return (
    <Link
      href={href}
      className="tp-tilt group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-night-700 bg-paper p-3.5 shadow-panel transition-all duration-300 hover:border-transparent hover:shadow-glow-mint"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 -bottom-8 h-20 w-20 rounded-full bg-gradient-to-tr from-fuchsia-400/25 to-cyan-400/20 blur-xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-2.5">
        <ArtRing size={42}>
          <TokenImage imageUrl={token.imageUrl} symbol={token.symbol} size={42} />
        </ArtRing>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold text-ink">{token.name}</p>
          <p className="truncate font-mono text-2xs text-night-500">
            ${token.symbol} · {timeAgo(token.createdAt)}
          </p>
        </div>
        <Icon
          name="chevronRight"
          size={14}
          className="shrink-0 text-night-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-mint-500"
        />
      </div>
      <div className="relative flex flex-wrap items-center gap-1.5">
        <RouteBadge route={token.route} />
        {token.mintAddress ? (
          <span className="rounded-md bg-night-800 px-1.5 py-0.5 font-mono text-2xs text-night-500">
            {shortAddress(token.mintAddress, 4)}
          </span>
        ) : (
          <span className="rounded-md bg-night-800 px-1.5 py-0.5 text-2xs text-night-500">mint pending</span>
        )}
      </div>
      {token.curveProgress != null && (
        <div className="relative flex items-center gap-2">
          <CurveProgressBar progress={token.curveProgress} />
          <span className="shrink-0 font-mono text-2xs text-mint-400">{formatCompact(token.curveProgress)}%</span>
        </div>
      )}
    </Link>
  );
}

export function LatestLaunchesPreview() {
  const [tokens, setTokens] = useState<TokenRowData[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/launches?limit=8&sort=recent");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { launches: TokenRowData[] };
      setTokens(data.launches);
    } catch {
      setTokens([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tokens === null
        ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-night-800/70" />)
        : tokens.length === 0
          ? (
            <div className="col-span-full rounded-3xl border border-dashed border-night-600 bg-paper/60 px-6 py-12 text-center">
              <p className="font-display text-lg font-bold text-ink">No launches yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
                Be the first — pick a path and send your token into the TwinPad universe.
              </p>
              <Link
                href="/create"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-glow-mint transition hover:brightness-110"
              >
                Launch Token
              </Link>
            </div>
          )
          : tokens.map((t) => <LaunchMiniCard key={t.id} token={t} />)}
    </div>
  );
}
