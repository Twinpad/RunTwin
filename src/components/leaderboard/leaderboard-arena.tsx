"use client";

/**
 * Leaderboard Arena — the gamified ranking environment.
 *
 * Two REAL ranking sources, clearly separated:
 *  - Creators: GET /api/leaderboard (launch counts + on-chain-verified
 *    graduations from TwinPad's registry). Top-3 podium with trophies +
 *    identicon avatars, then ranked cards. No earnings/volume data exists —
 *    none is implied.
 *  - Tokens: GET /api/trending tabs (Top Trending / Top Volume / Top
 *    Gainers / Most Bought) from the live Pump.fun engine, rendered as
 *    ranked collectible cards with real metrics.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TokenImage } from "@/components/dashboard/token-row";
import { Identicon } from "@/components/ui/identicon";
import { Icon } from "@/components/ui/icons";
import { abbreviateWallet, formatCompact, timeAgo } from "@/lib/format";
import type { TrendingRow, TrendingTab } from "@/lib/pump-live/types";

/* ------------------------------------------------------------------ */
/* Creator podium                                                      */
/* ------------------------------------------------------------------ */

interface CreatorRow {
  creatorWallet: string;
  launches: number;
  graduated: number;
  lastActive: string | null;
}

const METALS = [
  { ring: "from-yellow-300 via-amber-400 to-amber-600", chip: "🥇", glow: "shadow-[0_14px_36px_-12px_rgba(245,158,11,0.7)]", height: "h-24" },
  { ring: "from-slate-200 via-slate-300 to-slate-400", chip: "🥈", glow: "shadow-[0_14px_36px_-14px_rgba(148,163,184,0.7)]", height: "h-16" },
  { ring: "from-orange-300 via-amber-500 to-orange-600", chip: "🥉", glow: "shadow-[0_14px_36px_-14px_rgba(234,124,58,0.7)]", height: "h-12" },
];

function Podium({ rows }: { rows: CreatorRow[] }) {
  const order = [1, 0, 2]; // display 2nd, 1st, 3rd
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {order.map((idx) => {
        const row = rows[idx];
        if (!row) return <div key={idx} />;
        const m = METALS[idx];
        return (
          <Link
            key={row.creatorWallet}
            href={`/tokens?creator=${row.creatorWallet}`}
            className="group flex flex-col items-center gap-2"
          >
            <Identicon value={row.creatorWallet} size={idx === 0 ? 64 : 48} className="shadow-panel" />
            <span className="max-w-full truncate font-mono text-2xs text-night-400">
              {abbreviateWallet(row.creatorWallet)}
            </span>
            <div
              className={`tp-tilt flex w-full flex-col items-center justify-start gap-1 rounded-t-2xl border border-night-700/60 bg-gradient-to-b ${m.ring} p-3 ${m.height} ${m.glow} transition-transform duration-300 group-hover:-translate-y-1`}
            >
              <span className="text-lg">{m.chip}</span>
              <span className="font-display text-2xl font-extrabold text-[#2A1E4F]">{row.launches}</span>
              <span className="text-2xs font-bold uppercase tracking-wider text-[#2A1E4F]/80">launches</span>
              {row.graduated > 0 && (
                <span className="rounded-full bg-[#2A1E4F]/15 px-2 py-0.5 text-2xs font-bold text-[#2A1E4F]">
                  {row.graduated} graduated
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CreatorBoard({ metric, limit }: { metric: "launches" | "active" | "graduated"; limit: number }) {
  const [rows, setRows] = useState<CreatorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?metric=${metric}&limit=${limit}`);
      if (res.status === 503) throw new Error("Launch registry unavailable (database not configured).");
      if (!res.ok) throw new Error(`Registry error ${res.status}`);
      const data = (await res.json()) as { leaderboard: CreatorRow[] };
      setRows(data.leaderboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [metric, limit]);

  useEffect(() => {
    setRows(null);
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
        <button onClick={() => void load()} className="ml-2 rounded-lg border border-danger/40 px-2 py-0.5 text-2xs hover:bg-danger/10">
          Retry
        </button>
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-night-800/70" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-night-600 bg-paper/60 px-6 py-10 text-center">
        <p className="font-display text-base font-bold text-ink">No creators on the board yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
          Podium spots open up as soon as launches are recorded through TwinPad.
        </p>
      </div>
    );
  }
  const podium = rows.slice(0, 3);
  const restRows = rows.slice(3);
  return (
    <div className="space-y-5">
      <Podium rows={podium} />
      {restRows.length > 0 && (
        <ol className="space-y-2">
          {restRows.map((r, i) => (
            <li key={r.creatorWallet}>
              <Link
                href={`/tokens?creator=${r.creatorWallet}`}
                className="tp-tilt flex items-center gap-3 rounded-2xl border border-night-700 bg-paper p-3 transition-all duration-200 hover:border-mint-500/40"
              >
                <span className="w-7 shrink-0 text-center font-display text-sm font-extrabold text-night-500">{i + 4}</span>
                <Identicon value={r.creatorWallet} size={34} />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
                  {abbreviateWallet(r.creatorWallet)}
                </span>
                {r.lastActive && <span className="hidden text-2xs text-night-500 sm:inline">{timeAgo(r.lastActive)}</span>}
                <span className="shrink-0 rounded-lg bg-sky-100/70 px-2 py-0.5 text-2xs font-bold text-mint-700 dark:bg-sky-100/10 dark:text-mint-300">
                  {r.launches} 🚀
                </span>
                {r.graduated > 0 && (
                  <span className="shrink-0 rounded-lg bg-up/12 px-2 py-0.5 text-2xs font-bold text-up">
                    {r.graduated} 🎓
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Token boards (live engine tabs)                                     */
/* ------------------------------------------------------------------ */

const TOKEN_BOARDS: { key: TrendingTab; label: string; icon: string }[] = [
  { key: "trending", label: "Top Trending", icon: "flame" },
  { key: "volume", label: "Highest Volume", icon: "activity" },
  { key: "gainers", label: "Top Gainers", icon: "trending" },
  { key: "most-bought", label: "Most Active", icon: "zap" },
];

function TokenBoard({ tab }: { tab: TrendingTab }) {
  const [rows, setRows] = useState<TrendingRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch(`/api/trending?tab=${tab}&tf=24h&limit=10`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { rows: TrendingRow[] };
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setFailed(true);
    }
  }, [tab]);

  useEffect(() => {
    setRows(null);
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (failed) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        Token rankings are unavailable right now.
        <button onClick={() => void load()} className="ml-2 rounded-lg border border-danger/40 px-2 py-0.5 text-2xs hover:bg-danger/10">
          Retry
        </button>
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-night-800/70" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-night-600 bg-paper/60 px-6 py-10 text-center">
        <p className="font-display text-base font-bold text-ink">This board is waiting for its first trade</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
          Built from live activity only — nothing here is simulated or backfilled.
        </p>
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.mint}>
          <Link
            href={`/tokens/${r.mint}`}
            className="tp-tilt flex items-center gap-3 rounded-2xl border border-night-700 bg-paper p-3 transition-all duration-200 hover:border-mint-500/40"
          >
            <span
              className={`w-7 shrink-0 text-center font-display text-sm font-extrabold ${
                i === 0 ? "text-mint-500" : "text-night-500"
              }`}
            >
              {i + 1}
            </span>
            <span className="rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-400/40 p-[2px]">
              <TokenImage imageUrl={r.imageUrl} symbol={r.symbol} size={40} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-ink">
                {r.name} <span className="font-mono font-medium text-night-400">${r.symbol}</span>
              </span>
              <span className="block truncate font-mono text-2xs text-night-500">
                MC {r.marketCapUsd == null ? "N/A" : `$${formatCompact(r.marketCapUsd)}`} · Vol{" "}
                {r.volumeUsd == null ? "N/A" : `$${formatCompact(r.volumeUsd)}`}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-lg px-2 py-0.5 font-mono text-2xs font-bold ${
                r.changePct == null || !Number.isFinite(r.changePct)
                  ? "bg-night-800 text-night-500"
                  : r.changePct >= 0
                    ? "bg-up/12 text-up"
                    : "bg-down/12 text-down"
              }`}
            >
              {r.changePct == null || !Number.isFinite(r.changePct)
                ? "N/A"
                : `${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(2)}%`}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardArena() {
  const [board, setBoard] = useState<"creators" | TrendingTab>("creators");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setBoard("creators")}
          aria-pressed={board === "creators"}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-2xs font-bold transition-all duration-200 ${
            board === "creators"
              ? "border-transparent bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow-mint"
              : "border-night-700 bg-paper text-night-400 hover:border-mint-500/40 hover:text-ink"
          }`}
        >
          <Icon name="trophy" size={12} />
          Creator Arena
        </button>
        {TOKEN_BOARDS.map((t) => (
          <button
            key={t.key}
            onClick={() => setBoard(t.key)}
            aria-pressed={board === t.key}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-2xs font-bold transition-all duration-200 ${
              board === t.key
                ? "border-transparent bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow-mint"
                : "border-night-700 bg-paper text-night-400 hover:border-mint-500/40 hover:text-ink"
            }`}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {board === "creators" ? <CreatorBoard metric="launches" limit={20} /> : <TokenBoard tab={board} />}
    </div>
  );
}
