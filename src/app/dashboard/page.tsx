"use client";

/**
 * Dashboard — the personal command center.
 *
 * Views (deep-linkable via ?view=launches):
 *  - Overview: real SOL balance (client-side RPC through the wallet
 *    connection), launch stats from the registry, recent activity, and a
 *    watchlist teaser.
 *  - My Launches: every launch recorded for the connected creator wallet
 *    (GET /api/launches?creator=…), with lifecycle state.
 *
 * All data comes from existing backend sources + the connected wallet;
 * nothing is fabricated.
 */

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { RouteBadge, StatusBadge } from "@/components/brand/route-badge";
import { TokenImage, CurveProgressBar, type TokenRowData } from "@/components/dashboard/token-row";
import { Identicon } from "@/components/ui/identicon";
import { Icon } from "@/components/ui/icons";
import { timeAgo, formatCompact, shortAddress } from "@/lib/format";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

interface MyLaunch extends TokenRowData {
  signature: string | null;
  updatedAt: string;
}

function StatTile({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="tp-tilt rounded-2xl border border-night-700 bg-paper p-4 shadow-panel">
      <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-400/15 text-mint-500">
        <Icon name={icon} size={15} />
      </span>
      <p className="font-mono text-xl font-bold text-ink">{value}</p>
      <p className="text-2xs text-night-500">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [view, setView] = useState<"overview" | "launches">("overview");
  const [launches, setLaunches] = useState<MyLaunch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  // Deep-link: /dashboard?view=launches (dock "My Launches").
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    setView(v === "launches" ? "launches" : "overview");
  }, []);

  // Real SOL balance via the wallet's own connection (no new backend).
  useEffect(() => {
    if (!connected || !publicKey) {
      setBalance(null);
      return;
    }
    let live = true;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (live) setBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (live) setBalance(null);
      });
    return () => {
      live = false;
    };
  }, [connection, publicKey, connected]);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/launches?creator=${publicKey.toBase58()}&limit=50&sort=recent`);
      if (res.status === 503) {
        setError("Launch registry unavailable: the database is not configured on this deployment.");
        setLaunches(null);
        return;
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = (await res.json()) as { launches: MyLaunch[] };
      setLaunches(data.launches);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected) void load();
  }, [connected, load]);

  const total = launches?.length ?? 0;
  const trading = launches?.filter((l) => l.status === "CURVE_TRADING").length ?? 0;
  const graduated = launches?.filter((l) => l.status === "GRADUATION_DETECTED" || l.status === "POOL_VERIFIED").length ?? 0;
  const recent = launches?.slice(0, 5) ?? [];

  if (!connected || !publicKey) {
    return (
      <div className="animate-fade-up">
        <h1 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink">Dashboard</h1>
        <p className="mb-6 text-sm text-night-400">
          Launched with your connected wallet — TwinPad attributes by creator address, never by custody.
        </p>
        <EmptyState
          title="Connect your wallet"
          description="Your launches, balances and activity appear here once a wallet is connected."
          action={
            <span className="inline-flex items-center gap-2 text-sm text-mint-400">
              <Icon name="wallet" size={14} /> Use the wallet button in the top bar
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <Identicon value={publicKey.toBase58()} size={44} />
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Dashboard</h1>
            <p className="font-mono text-2xs text-night-500">{shortAddress(publicKey.toBase58(), 6)}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-glow-mint transition hover:brightness-110"
          >
            <Icon name="plus" size={13} /> New launch
          </Link>
          <button
            onClick={() => void load()}
            aria-label="Refresh"
            className="rounded-xl border border-night-700 p-2 text-night-400 transition hover:border-night-500 hover:text-ink"
          >
            <Icon name="refresh" size={14} />
          </button>
        </div>
      </header>

      {/* View tabs */}
      <div className="flex items-center gap-1.5">
        {(
          [
            { key: "overview", label: "Overview", icon: "grid" },
            { key: "launches", label: "My Launches", icon: "rocket" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            aria-pressed={view === t.key}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-2xs font-bold transition-all duration-200 ${
              view === t.key
                ? "border-transparent bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow-mint"
                : "border-night-700 bg-paper text-night-400 hover:border-mint-500/40 hover:text-ink"
            }`}
          >
            <Icon name={t.icon} size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Spinner label="Loading launches…" />}
      {error && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Overview */}
      {view === "overview" && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="SOL balance" value={balance == null ? "—" : balance.toFixed(4)} icon="wallet" />
            <StatTile label="Launches" value={total} icon="rocket" />
            <StatTile label="On curve" value={trading} icon="activity" />
            <StatTile label="Graduated" value={graduated} icon="award" />
          </div>

          <section aria-label="Recent launches" className="rounded-3xl border border-night-700/70 bg-paper p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                <Icon name="rocket" size={15} className="text-mint-500" /> Recent launches
              </h2>
              <button onClick={() => setView("launches")} className="text-2xs font-bold text-mint-500 hover:underline">
                View all →
              </button>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                title="No launches yet"
                description="Launches initiated with this wallet will be listed here with their lifecycle state."
                action={
                  <Link href="/create" className="text-sm text-mint-400 hover:underline">
                    Start a new launch →
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-1">
                {recent.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={l.mintAddress ? `/tokens/${l.mintAddress}` : `/launch/${l.signature ?? l.id}`}
                      className="row-sep flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-night-800/60"
                    >
                      <TokenImage imageUrl={l.imageUrl} symbol={l.symbol} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-ink">
                          {l.name} <span className="font-mono font-medium text-night-400">${l.symbol}</span>
                        </span>
                        <span className="block text-2xs text-night-500">{timeAgo(l.createdAt)}</span>
                      </span>
                      <RouteBadge route={l.route} />
                      <StatusBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-2xs text-night-500">
            Tip: star any token on its detail page to follow it in your{" "}
            <Link href="/watchlist" className="text-ice-300 hover:underline">
              watchlist
            </Link>
            . Full balances and holdings live in your{" "}
            <Link href="/portfolio" className="text-ice-300 hover:underline">
              portfolio
            </Link>
            .
          </p>
        </div>
      )}

      {/* My launches */}
      {view === "launches" && !loading && launches && launches.length === 0 && (
        <EmptyState
          title="No launches yet"
          description="Launches initiated with this wallet will be listed here with their lifecycle state."
          action={
            <Link href="/create" className="text-sm text-mint-400 hover:underline">
              Start a new launch →
            </Link>
          }
        />
      )}
      {view === "launches" && launches && launches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {launches.map((l) => (
            <Link
              key={l.id}
              href={l.mintAddress ? `/tokens/${l.mintAddress}` : `/launch/${l.signature ?? l.id}`}
              className="tp-tilt group flex flex-col gap-2.5 rounded-2xl border border-night-700 bg-paper p-4 shadow-panel transition-all duration-300 hover:border-transparent hover:shadow-glow-mint"
            >
              <div className="flex items-center gap-3">
                <TokenImage imageUrl={l.imageUrl} symbol={l.symbol} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold text-ink">{l.name}</p>
                  <p className="truncate font-mono text-2xs text-night-500">
                    ${l.symbol} · {timeAgo(l.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <RouteBadge route={l.route} />
                <StatusBadge status={l.status} />
              </div>
              {l.curveProgress != null && (
                <div className="flex items-center gap-2">
                  <CurveProgressBar progress={l.curveProgress} />
                  <span className="shrink-0 font-mono text-2xs text-mint-400">{l.curveProgress.toFixed(0)}%</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


