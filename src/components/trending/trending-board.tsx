"use client";

/**
 * Trending Universe — the redesigned market discovery experience.
 *
 * Real-time Pump.fun rankings from TwinPad's backend engine (/api/trending +
 * SSE /api/trending/stream). The backend owns the single PumpPortal
 * connection; the browser subscribes to TwinPad's stream only.
 *
 * Layout: one FEATURED collectible card (the current #1) above a responsive
 * grid of compact collectible cards. Every number is real engine output —
 * unavailable metrics render as N/A, never fabricated.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TokenImage } from "@/components/dashboard/token-row";
import { Icon } from "@/components/ui/icons";
import { timeAgo } from "@/lib/format";
import type { TrendingRow, TrendingTab, TrendingTimeframe } from "@/lib/pump-live/types";

const TABS: { key: TrendingTab; label: string; icon: string }[] = [
  { key: "trending", label: "Trending Now", icon: "flame" },
  { key: "volume", label: "Top Volume", icon: "activity" },
  { key: "gainers", label: "Top Gainers", icon: "trending" },
  { key: "losers", label: "Top Losers", icon: "trending" },
  { key: "most-bought", label: "Most Bought", icon: "zap" },
  { key: "newest", label: "Newest", icon: "rocket" },
  { key: "migrated", label: "Migrated", icon: "award" },
];

const TIMEFRAMES: { key: TrendingTimeframe; label: string }[] = [
  { key: "5m", label: "5M" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "12h", label: "12H" },
  { key: "24h", label: "24H" },
];

interface StreamPayload {
  type: "trending";
  rows: TrendingRow[];
  meta: {
    solUsd: number | null;
    solUsdSource: string | null;
    generatedAt: number;
    historyPartial: boolean;
    stale: boolean;
  };
}

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

type ConnState = "live" | "reconnecting" | "offline";

function ActivityBar({ buys, sells }: { buys: number; sells: number }) {
  const total = buys + sells;
  const pct = total > 0 ? Math.round((buys / total) * 100) : null;
  if (pct === null) {
    return <div className="h-1.5 w-full rounded-full bg-night-700" title="No trades in this window yet" />;
  }
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-night-700" title={`${buys} buys / ${sells} sells`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-lagoon-400 to-ice-400 transition-[width] duration-700"
        style={{ width: `${Math.max(6, Math.min(94, pct))}%` }}
      />
    </div>
  );
}

function TrendCard({ row, rank, featured = false }: { row: TrendingRow; rank: number; featured?: boolean }) {
  if (featured) {
    return (
      <Link
        href={`/tokens/${row.mint}`}
        className="tp-tilt group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-[#170B45] via-[#201060] to-[#2A1068] p-6 text-white shadow-[0_24px_60px_-24px_rgba(109,40,217,0.65)]"
      >
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-lagoon-400/25 blur-2xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-bloom-500/25 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-2xs font-extrabold uppercase tracking-[0.14em] backdrop-blur-sm">
            <Icon name="flame" size={12} />
            Featured · Rank #{rank + 1}
          </span>
          <div className="flex items-center gap-1.5">
            {row.hot && (
              <span className="rounded-full bg-spark-400 px-2 py-0.5 text-2xs font-extrabold text-[#20124D]">HOT</span>
            )}
            {row.migrated && (
              <span className="rounded-full bg-emerald-400/90 px-2 py-0.5 text-2xs font-extrabold text-[#20124D]">MIGRATED</span>
            )}
          </div>
        </div>
        <div className="relative flex items-center gap-4">
          <span className="rounded-3xl bg-white/15 p-[3px] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-sm">
            <TokenImage imageUrl={row.imageUrl} symbol={row.symbol} size={76} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-extrabold">{row.name}</p>
            <p className="font-mono text-xs text-white/80">${row.symbol}</p>
            <p className="mt-1 truncate font-mono text-2xs text-white/60">{row.mint}</p>
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
            <p className="text-2xs text-white/65">Change</p>
            <p
              className={`font-mono font-bold ${
                row.changePct != null && row.changePct < 0 ? "text-rose-200" : "text-emerald-200"
              }`}
            >
              {fmtChange(row.changePct)}
            </p>
          </div>
        </div>
        <div className="relative">
          <ActivityBar buys={row.buys} sells={row.sells} />
          <div className="mt-1.5 flex items-center justify-between text-2xs text-white/70">
            <span>
              {row.buys} buys · {row.sells} sells
            </span>
            <span>age {timeAgo(row.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href={`/tokens/${row.mint}`}
      className="tp-tilt group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-night-700 bg-paper p-3.5 shadow-panel transition-all duration-300 hover:border-transparent hover:shadow-glow-mint"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br from-lagoon-400/25 to-bloom-500/20 blur-xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-2.5">
        <span className="font-display text-2xs font-extrabold text-night-500">#{rank + 1}</span>
        <span className="rounded-2xl bg-gradient-to-br from-bloom-400/60 via-bloom-300/30 to-lagoon-400/60 p-[2px] shadow-glow-mint">
          <span className="block overflow-hidden rounded-[14px] bg-paper dark:bg-[#181045]">
            <TokenImage imageUrl={row.imageUrl} symbol={row.symbol} size={44} />
          </span>
        </span>
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
        <span
          className={`rounded-lg px-1.5 py-0.5 font-mono text-2xs font-bold ${
            row.changePct == null || !Number.isFinite(row.changePct)
              ? "bg-night-800 text-night-500"
              : row.changePct >= 0
                ? "bg-up/12 text-up"
                : "bg-down/12 text-down"
          }`}
        >
          {fmtChange(row.changePct)}
        </span>
      </div>
      <div className="relative flex items-center justify-between text-2xs text-night-500">
        <span>
          Vol <span className="font-mono text-night-400">{fmtUsd(row.volumeUsd)}</span>
        </span>
        <span>
          MC <span className="font-mono text-night-400">{fmtUsd(row.marketCapUsd)}</span>
        </span>
      </div>
      <div className="relative">
        <ActivityBar buys={row.buys} sells={row.sells} />
        <div className="mt-1 flex items-center justify-between text-2xs text-night-500">
          <span>
            {row.buys}B / {row.sells}S
          </span>
          <span>age {timeAgo(row.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function TrendingBoard() {
  const [tab, setTab] = useState<TrendingTab>("trending");
  const [tf, setTf] = useState<TrendingTimeframe>("1h");
  const [rows, setRows] = useState<TrendingRow[]>([]);
  const [meta, setMeta] = useState<StreamPayload["meta"] | null>(null);
  const [conn, setConn] = useState<ConnState>("reconnecting");
  const [stale, setStale] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const apply = useCallback((p: StreamPayload) => {
    setRows(Array.isArray(p.rows) ? p.rows : []);
    setMeta(p.meta);
    setConn("live");
  }, []);

  // Initial + on-demand REST fetch (first paint and tab switches).
  useEffect(() => {
    let live = true;
    setLoadError(false);
    fetch(`/api/trending?tab=${tab}&tf=${tf}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((j: StreamPayload) => {
        if (live) apply(j);
      })
      .catch(() => {
        if (live) setLoadError(true);
      });
    return () => {
      live = false;
    };
  }, [tab, tf, apply]);

  // SSE subscription — the browser's only real-time channel. EventSource
  // reconnects natively; we surface the honest connection state.
  useEffect(() => {
    setConn("reconnecting");
    const es = new EventSource(`/api/trending/stream?tab=${tab}&tf=${tf}`);
    esRef.current = es;
    es.onmessage = (ev: MessageEvent<string>) => {
      try {
        apply(JSON.parse(ev.data) as StreamPayload);
      } catch {
        /* malformed frame — ignore, next frame re-syncs */
      }
    };
    es.onerror = () => setConn("offline");
    return () => {
      es.close();
      esRef.current = null;
    };
  }, [tab, tf, apply]);

  // Staleness ticker: the stream may stall without an error event.
  useEffect(() => {
    const t = setInterval(() => {
      setStale(!meta || Date.now() - meta.generatedAt > 15_000);
    }, 5_000);
    return () => clearInterval(t);
  }, [meta]);

  const featured = rows[0];
  const rest = rows.slice(1, 10);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-2xs font-bold transition-all duration-200 ${
                tab === t.key
                  ? "border-transparent bg-gradient-to-br from-bloom-500 to-lagoon-500 text-white shadow-glow-mint"
                  : "border-night-700 bg-paper text-night-400 hover:border-mint-500/40 hover:text-ink"
              }`}
            >
              <Icon name={t.icon} size={12} className={t.key === "losers" ? "-scale-y-100" : ""} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-night-700 bg-paper p-0.5">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTf(t.key)}
                aria-pressed={tf === t.key}
                disabled={tab === "newest" || tab === "migrated"}
                className={`rounded-lg px-2.5 py-1 text-2xs font-extrabold transition-colors duration-200 disabled:opacity-40 ${
                  tf === t.key ? "bg-gradient-to-br from-bloom-500 to-lagoon-500 text-white" : "text-night-400 hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-night-700 bg-night-950 px-2.5 py-1 text-2xs font-bold text-night-400"
            title={stale ? "Data stream stalled — reconnecting" : conn === "live" ? "Receiving live Pump.fun events" : "Connecting to the live stream"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                conn === "live" && !stale ? "bg-up animate-pulse-soft" : conn === "live" ? "bg-warn" : "bg-down animate-pulse-soft"
              }`}
            />
            {stale ? "Stalled" : conn === "live" ? "Live" : conn === "reconnecting" ? "Connecting…" : "Offline"}
          </span>
        </div>
      </div>

      {/* Honest data-coverage notices */}
      {meta?.historyPartial && (
        <p className="rounded-xl border border-night-700/70 bg-night-800/60 px-3 py-2 text-2xs text-night-400">
          Rolling windows are still filling — rankings cover only the period since this pipeline started
          collecting live trades (24h history completes as data accumulates).
        </p>
      )}
      {stale && (
        <p className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-2xs text-warn">
          Live stream stalled — showing the last verified snapshot while the backend reconnects.
        </p>
      )}

      {loadError && rows.length === 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Trending rankings are unavailable right now.
          <button
            onClick={() => setLoadError(false)}
            className="ml-2 rounded-lg border border-danger/40 px-2 py-0.5 text-2xs hover:bg-danger/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Universe grid */}
      {rows.length === 0 && !loadError ? (
        <div className="rounded-3xl border border-dashed border-night-600 bg-paper/60 px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">Nothing on this board yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
            Rankings fill up from real trades as they happen — never simulated, never backfilled.
          </p>
        </div>
      ) : (
        rows.length > 0 && (
          <div className="space-y-4">
            <TrendCard row={featured} rank={0} featured />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {rest.map((row, i) => (
                <TrendCard key={row.mint} row={row} rank={i + 1} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
