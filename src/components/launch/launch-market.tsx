"use client";

/**
 * Launch Marketplace — the collectible "Latest Launches" experience.
 *
 * Data: GET /api/launches (TwinPad's launch registry — the same endpoint the
 * dashboard panels use), with route filters, lifecycle status groups, sort
 * order and search. Only real registry records are rendered.
 */

import { useCallback, useEffect, useState } from "react";
import { LaunchMiniCard } from "@/components/home/home-sections";
import { Icon } from "@/components/ui/icons";
import type { TokenRowData } from "@/components/dashboard/token-row";

type Filter = "all" | "newest" | "active" | "pump" | "launchlab" | "graduated";

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "newest", label: "Newest", icon: "rocket" },
  { key: "active", label: "Recently Active", icon: "activity" },
  { key: "pump", label: "Pump.fun", icon: "flame" },
  { key: "launchlab", label: "Raydium", icon: "layers" },
  { key: "graduated", label: "Graduated", icon: "award" },
];

function paramsFor(filter: Filter, q: string): string {
  const params = new URLSearchParams({ limit: "48" });
  if (filter === "newest" || filter === "all") params.set("sort", "recent");
  if (filter === "active") params.set("sort", "active");
  if (filter === "pump") params.set("route", "PUMP_PUMPSWAP");
  if (filter === "launchlab") params.set("route", "LAUNCHLAB_CPMM");
  if (filter === "graduated") params.set("statusGroup", "graduating");
  if (q.trim()) params.set("q", q.trim());
  return params.toString();
}

export function LaunchMarket({ initialFilter = "all" }: { initialFilter?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [tokens, setTokens] = useState<TokenRowData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/launches?${paramsFor(filter, query)}`);
      if (res.status === 503) throw new Error("Launch registry unavailable (database not configured).");
      if (!res.ok) throw new Error(`Registry error ${res.status}`);
      const data = (await res.json()) as { launches: TokenRowData[] };
      setTokens(data.launches);
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [filter, query]);

  useEffect(() => {
    setTokens(null);
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-2xs font-bold transition-all duration-200 ${
                filter === f.key
                  ? "border-transparent bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow-mint"
                  : "border-night-700 bg-paper text-night-400 hover:border-mint-500/40 hover:text-ink"
              }`}
            >
              <Icon name={f.icon} size={12} />
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-night-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ticker, mint or creator…"
            aria-label="Search launches"
            className="w-full rounded-xl border border-night-700 bg-paper py-2 pl-8 pr-2 text-xs text-ink placeholder:text-night-500 transition-colors focus:border-mint-500 focus:outline-none"
          />
        </div>
      </div>

      {updatedAt && (
        <p className="text-2xs text-night-500">
          Registry snapshot {new Date(updatedAt).toLocaleTimeString()} · auto-refreshes every 30s
        </p>
      )}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
          <button onClick={() => void load()} className="ml-2 rounded-lg border border-danger/40 px-2 py-0.5 text-2xs hover:bg-danger/10">
            Retry
          </button>
        </div>
      ) : tokens === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-night-800/70" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-night-600 bg-paper/60 px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">No launches match this view</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-night-400">
            {q.trim()
              ? "Try a different name, ticker, mint or creator address."
              : "Launches recorded through TwinPad appear here with verified lifecycle data."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-2xs text-night-500">{tokens.length} launches</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {tokens.map((t) => (
              <LaunchMiniCard key={t.id} token={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
