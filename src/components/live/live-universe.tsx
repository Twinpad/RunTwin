"use client";

/**
 * Live Market Universe — the redesigned live activity experience.
 *
 * Three real data planes, each with an honest connection state:
 *  1. Pulse wall — live Pump.fun ranking stream (SSE /api/trending/stream,
 *     the same backend-owned PumpPortal feed as Trending). The status pill
 *     reflects the REAL EventSource state; a stalled stream is labeled as
 *     stalled, never as live.
 *  2. Launch timeline — registry lifecycle events (GET /api/activity).
 *  3. New pairs strip — discovery (GET /api/discovery?tab=new-pools).
 *
 * No simulated trades, wallets, or events anywhere.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TokenImage } from "@/components/dashboard/token-row";
import { RouteBadge } from "@/components/brand/route-badge";
import { Identicon } from "@/components/ui/identicon";
import { Icon } from "@/components/ui/icons";
import { timeAgo, shortAddress } from "@/lib/format";
import type { TrendingRow } from "@/lib/pump-live/types";
import type { DiscoveredToken } from "@/lib/discovery/types";

type ConnState = "live" | "reconnecting" | "offline";

function ConnPill({ conn, stale }: { conn: ConnState; stale: boolean }) {
  const label = stale
    ? "Stream stalled"
    : conn === "live"
      ? "Live"
      : conn === "reconnecting"
        ? "Connecting…"
        : "Offline";
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-night-700 bg-night-950 px-3 py-1.5 text-2xs font-bold text-night-400"
      title={
        stale
          ? "The live stream has not delivered a fresh snapshot recently"
          : conn === "live"
            ? "Receiving live Pump.fun events through TwinPad's backend"
            : "Connecting to TwinPad's live stream"
      }
    >
      <span
        className={`h-2 w-2 rounded-full ${
          conn === "live" && !stale
            ? "bg-up animate-pulse-soft"
            : conn === "live"
              ? "bg-warn"
              : "bg-down animate-pulse-soft"
        }`}
      />
      {label}
    </span>
  );
}

function fmtChange(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "N/A";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

interface StreamPayload {
  type: "trending";
  rows: TrendingRow[];
  meta: { generatedAt: number; stale: boolean; solUsd: number | null };
}

function PulseCard({ row }: { row: TrendingRow }) {
  const na = row.changePct == null || !Number.isFinite(row.changePct);
  const up = row.changePct != null && Number.isFinite(row.changePct) && row.changePct >= 0;
  return (
    <Link
      href={`/tokens/${row.mint}`}
      className="tp-tilt group relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-night-700 bg-paper p-3.5 shadow-panel transition-all duration-300 hover:border-transparent hover:shadow-glow-mint"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${
          na ? "bg-night-600" : up ? "bg-gradient-to-r from-emerald-400 to-cyan-400" : "bg-gradient-to-r from-rose-400 to-fuchsia-400"
        }`}
      />
      <div className="flex items-center gap-2.5">
        <span className="rounded-xl bg-gradient-to-br from-violet-500/50 to-cyan-400/50 p-[2px]">
          <span className="block overflow-hidden rounded-[10px] bg-paper dark:bg-[#1D1442]">
            <TokenImage imageUrl={row.imageUrl} symbol={row.symbol} size={38} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xs font-bold text-ink">{row.name}</p>
          <p className="truncate font-mono text-2xs text-night-500">${row.symbol}</p>
        </div>
        <Identicon value={row.mint} size={26} className="opacity-80" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-2xs text-ink">
          {row.priceUsd == null || !Number.isFinite(row.priceUsd)
            ? "N/A"
            : row.priceUsd >= 1
              ? `$${row.priceUsd.toFixed(2)}`
              : `$${row.priceUsd.toPrecision(3)}`}
        </span>
        <span
          className={`rounded-lg px-1.5 py-0.5 font-mono text-2xs font-extrabold ${
            na ? "bg-night-800 text-night-500" : up ? "bg-up/12 text-up" : "bg-down/12 text-down"
          }`}
        >
          {fmtChange(row.changePct)}
        </span>
      </div>
      <div className="flex items-center justify-between text-2xs text-night-500">
        <span className="inline-flex items-center gap-1 text-up">
          <Icon name="plus" size={10} /> {row.buys}
        </span>
        <span className="inline-flex items-center gap-1 text-down">
          <Icon name="x" size={10} /> {row.sells}
        </span>
        <span className="font-mono">{timeAgo(row.lastTradeAt ?? row.createdAt)}</span>
      </div>
    </Link>
  );
}

export function PulseWall() {
  const [rows, setRows] = useState<TrendingRow[]>([]);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [conn, setConn] = useState<ConnState>("reconnecting");
  const [stale, setStale] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // SSE — one subscription to TwinPad's backend-owned stream.
  useEffect(() => {
    setConn("reconnecting");
    const es = new EventSource("/api/trending/stream?tab=trending&tf=1h");
    esRef.current = es;
    es.onmessage = (ev: MessageEvent<string>) => {
      try {
        const p = JSON.parse(ev.data) as StreamPayload;
        if (Array.isArray(p.rows)) {
          setRows(p.rows.slice(0, 12));
          setGeneratedAt(p.meta?.generatedAt ?? Date.now());
          setConn("live");
        }
      } catch {
        /* skip malformed frame */
      }
    };
    es.onerror = () => setConn("offline");
    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setStale(generatedAt == null || Date.now() - generatedAt > 20_000);
    }, 5_000);
    return () => clearInterval(t);
  }, [generatedAt]);

  return (
    <section aria-label="Live pulse wall">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Icon name="zap" size={17} className="text-mint-500" />
          Market pulse
          <span className="text-2xs font-medium text-night-500">top movers by live buy pressure</span>
        </h2>
        <ConnPill conn={conn} stale={stale} />
      </div>
      {stale && (
        <p className="mb-3 rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-2xs text-warn">
          The live stream has not delivered a fresh snapshot in the last 20 seconds — showing the last
          verified state while the backend reconnects. This is not live data right now.
        </p>
      )}
      {rows.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-night-800/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <PulseCard key={row.mint} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Launch timeline (registry lifecycle events)                      */
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
  graduation_detected: { label: "Graduation detected", icon: "zap", tile: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300" },
  pool_verified: { label: "Pool verified", icon: "check", tile: "bg-up/15 text-up" },
  failed: { label: "Failed", icon: "alert", tile: "bg-down/15 text-down" },
  unresolved: { label: "Unresolved", icon: "alert", tile: "bg-warn/15 text-warn" },
};

export function LaunchTimeline() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/activity?limit=60");
      if (res.status === 503) throw new Error("Launch registry unavailable (database not configured).");
      if (!res.ok) throw new Error(`Registry error ${res.status}`);
      const data = (await res.json()) as { events: ActivityEvent[] };
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20_000);
    const onOnline = () => void load();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", onOnline);
    };
  }, [load]);

  return (
    <section aria-label="Launch timeline">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Icon name="rocket" size={17} className="text-mint-500" />
          Launch timeline
          <span className="text-2xs font-medium text-night-500">verified registry lifecycle events</span>
        </h2>
        <Link href="/launches" className="text-2xs font-bold text-mint-500 hover:underline">
          Launch marketplace →
        </Link>
      </div>
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
          <button onClick={() => void load()} className="ml-2 rounded-lg border border-danger/40 px-2 py-0.5 text-2xs hover:bg-danger/10">
            Retry
          </button>
        </div>
      ) : events === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-night-800/70" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-night-600 bg-paper/60 px-6 py-10 text-center">
          <p className="font-display text-base font-bold text-ink">No launch events yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
            Events appear when creators prepare, submit, and confirm launches through TwinPad.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-2 border-l-2 border-dashed border-night-600/60 pl-5">
          {events.map((ev) => {
            const meta = KIND_META[ev.kind] ?? { label: ev.kind, icon: "info", tile: "bg-night-800 text-night-400" };
            return (
              <li key={ev.id} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[30px] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper dark:border-[#150E33] ${meta.tile}`}
                >
                  <Icon name={meta.icon} size={11} />
                </span>
                <Link
                  href={`/tokens/${ev.launch.mintAddress ?? ev.launch.id}`}
                  className="tp-tilt flex items-center gap-3 rounded-2xl border border-night-700 bg-paper p-3 transition-all duration-200 hover:border-mint-500/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink">
                      {meta.label}: <span className="text-mint-500 dark:text-mint-300">{ev.launch.name}</span>
                      <span className="ml-1 font-mono font-medium text-night-400">${ev.launch.symbol}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-2xs text-night-500">
                      <span>{timeAgo(ev.createdAt)}</span>
                      {ev.launch.mintAddress && (
                        <span className="hidden font-mono sm:inline">{shortAddress(ev.launch.mintAddress, 4)}</span>
                      )}
                    </span>
                  </span>
                  <RouteBadge route={ev.launch.route} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. New trading pairs strip                                          */
/* ------------------------------------------------------------------ */

export function NewPairsStrip() {
  const [tokens, setTokens] = useState<DiscoveredToken[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/discovery?tab=new-pools&pageSize=8&sort=newest");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { tokens: DiscoveredToken[] };
      setTokens(data.tokens);
    } catch {
      setTokens([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 45_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section aria-label="New trading pairs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Icon name="layers" size={17} className="text-mint-500" />
          New trading pairs
          <span className="text-2xs font-medium text-night-500">verified on-chain pools</span>
        </h2>
        <Link href="/tokens" className="text-2xs font-bold text-mint-500 hover:underline">
          Explore all →
        </Link>
      </div>
      {tokens === null ? (
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 w-56 shrink-0 animate-pulse rounded-2xl bg-night-800/70" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-night-600 bg-paper/60 px-4 py-6 text-center text-sm text-night-400">
          No new verified pools yet — they appear here once graduation is confirmed on-chain.
        </p>
      ) : (
        <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {tokens.map((t) => (
            <li key={t.mint} className="w-56 shrink-0 snap-start">
              <Link
                href={`/tokens/${t.mint}`}
                className="tp-tilt flex items-center gap-2.5 rounded-2xl border border-night-700 bg-paper p-2.5 transition-all duration-200 hover:border-mint-500/40"
              >
                <TokenImage imageUrl={t.imageUrl} symbol={t.symbol} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-ink">{t.name}</span>
                  <span className="block truncate font-mono text-2xs text-night-500">
                    ${t.symbol} · {shortAddress(t.mint, 4)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { ConnPill };
