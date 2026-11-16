"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/adapters";
import type { LaunchRoute } from "@/lib/adapters/types";
import {
  AVAILABILITY_COPY,
  classifyAvailabilityError,
  loadingAvailability,
  type RouteAvailability,
} from "@/lib/adapters/availability";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

type AvailabilityMap = Partial<Record<LaunchRoute, RouteAvailability>>;

/** Mini launch-portal artwork — CSS conic swirl in the route's colorway. */
function MiniPortalArt({ route }: { route: LaunchRoute }) {
  const ring =
    route === "pump"
      ? "from-lagoon-400 via-lagoon-300 to-lagoon-500"
      : "from-bloom-400 via-bloom-300 to-bloom-500";
  return (
    <span aria-hidden className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      <span
        className={`tp-portal-spin absolute inset-0 rounded-full bg-gradient-to-br ${ring} opacity-90`}
        style={{ padding: 4 }}
      >
        <span className="block h-full w-full rounded-full bg-paper dark:bg-[#181045]" />
      </span>
      <span className={`tp-portal-spin-rev absolute inset-[26%] rounded-full bg-gradient-to-tr ${ring} opacity-70`} />
      <span className="relative font-display text-xs font-extrabold text-ink dark:text-white">
        {route === "pump" ? "01" : "02"}
      </span>
    </span>
  );
}

/**
 * Launch-method selection — two selectable route cards.
 *
 * Each card is a real WAI-ARIA radio (roving tabindex, Enter/Space/arrows)
 * covering its whole surface. Availability is checked SERVER-SIDE
 * (GET /api/launch/availability?route=…): the endpoint runs each route
 * adapter's real mainnet readiness path on a dedicated gateway pool, so the
 * two checks stay independent, never queue behind background provider
 * traffic, and keep working while the primary RPC pool's circuit breaker is
 * open. States are shown honestly: loading → ready / rate_limited (the
 * provider is throttling us — retries automatically) / retry (transient
 * transport trouble — manual retry) / unsupported (route genuinely not
 * deployed on this cluster). A route that is not ready cannot be selected,
 * raw errors are never rendered, and the Continue gate downstream stays
 * honest.
 */
export function RouteSelector({
  value,
  onChange,
  cluster,
  onAvailabilityChange,
}: {
  value: LaunchRoute;
  onChange: (r: LaunchRoute) => void;
  cluster: string;
  /** Optional: report the live availability map (for Continue gating). */
  onAvailabilityChange?: (map: AvailabilityMap) => void;
}) {
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const runIdRef = useRef(0);
  const autoRetryRef = useRef<
    Partial<Record<LaunchRoute, { attempts: number; timer?: ReturnType<typeof setTimeout> }>>
  >({});
  const cardRefs = useRef<Partial<Record<LaunchRoute, HTMLDivElement | null>>>({});

  const clearAutoRetry = (id: LaunchRoute) => {
    const entry = autoRetryRef.current[id];
    if (entry?.timer) clearTimeout(entry.timer);
    delete autoRetryRef.current[id];
  };

  /**
   * One route's check — fully independent of the other route. Runs against
   * the server-side availability endpoint (real adapter mainnet readiness on
   * a dedicated gateway pool).
   */
  async function checkRoute(id: LaunchRoute, opts?: { auto?: boolean }) {
    try {
      const res = await fetch(`/api/launch/availability?route=${id}`, {
        signal: AbortSignal.timeout(45_000),
      });
      const data = (await res.json()) as RouteAvailability & {
        retryAfterSeconds?: number;
      };
      // Technical program/config facts stay server-side (the endpoint still
      // returns them for diagnostics) — the launch card shows only the
      // honest status line.
      const payload: RouteAvailability = {
        state: data.state,
        message: data.message,
        retryAfterSeconds: data.retryAfterSeconds,
      };
      setAvailability((prev) => ({ ...prev, [id]: payload }));
      if (payload.state === "rate_limited") {
        // Provider throttling is transient: retry this route automatically
        // (bounded — after N attempts the manual Retry button takes over).
        const attempts = (autoRetryRef.current[id]?.attempts ?? 0) + 1;
        if (attempts <= 4) {
          const delay = Math.min(20_000, Math.max(4_000, (payload.retryAfterSeconds ?? 5) * 1000));
          const timer = setTimeout(() => {
            void checkRoute(id, { auto: true });
          }, delay);
          autoRetryRef.current[id] = { attempts, timer };
          return;
        }
        autoRetryRef.current[id] = { attempts, timer: undefined };
        return;
      }
      clearAutoRetry(id);
    } catch (err) {
      // The endpoint itself was unreachable — honest retry state; the manual
      // Retry button re-runs the check.
      console.error(`[route-selector] ${id} availability check failed:`, err);
      setAvailability((prev) => ({ ...prev, [id]: classifyAvailabilityError(err) }));
      clearAutoRetry(id);
    }
  }

  // Full check: both routes in parallel, each independent.
  const check = useCallback(async () => {
    const runId = ++runIdRef.current;
    setAvailability(Object.fromEntries(ROUTES.map((r) => [r.id, loadingAvailability()])));
    for (const r of ROUTES) clearAutoRetry(r.id);
    await Promise.all(ROUTES.map((route) => checkRoute(route.id)));
  }, []);

  useEffect(() => {
    void check();
    return () => {
      for (const r of ROUTES) clearAutoRetry(r.id);
    };
  }, [check]);

  useEffect(() => {
    onAvailabilityChange?.(availability);
  }, [availability, onAvailabilityChange]);

  const firstSelectable = ROUTES.find(
    (r) => (availability[r.id]?.state ?? "loading") === "ready",
  );

  const select = (id: LaunchRoute) => {
    if ((availability[id]?.state ?? "loading") === "ready") onChange(id);
  };

  return (
    <div role="radiogroup" aria-label="Launch method" className="grid gap-4 md:grid-cols-2">
      {ROUTES.map((route, index) => {
        const state = availability[route.id]?.state ?? "loading";
        // A route that is not ready must never appear selected — the user
        // cannot keep an unusable selection (Continue is gated separately).
        const selected = value === route.id && state === "ready";
        const selectable = state === "ready";
        // Roving tabindex: the selected card is the tab stop; otherwise the
        // first ready card; if nothing is ready yet, the first card stays
        // keyboard-reachable so its status/retry can be reached.
        const tabIndex =
          selected || firstSelectable?.id === route.id || (!firstSelectable && index === 0)
            ? 0
            : -1;

        // Exclusive state classes (never two competing border/bg utilities).
        const borderCls = selected
          ? "border-mint-500 ring-2 ring-mint-500/25"
          : selectable
            ? "border-night-700 hover:border-mint-500/60"
            : "border-night-700";
        const bgCls = selected ? "bg-sky-50/70" : selectable ? "bg-paper hover:bg-sky-50" : "bg-paper";
        const shadowCls = selected
          ? "shadow-glow-mint"
          : selectable
            ? "shadow-panel hover:shadow-glow-mint"
            : "shadow-panel";

        return (
          <div
            key={route.id}
            ref={(el) => {
              cardRefs.current[route.id] = el;
            }}
            role="radio"
            aria-checked={selected}
            aria-disabled={!selectable}
            aria-describedby={`route-availability-${route.id}`}
            tabIndex={tabIndex}
            onClick={() => select(route.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                if (state === "ready") select(route.id);
                else if (state === "retry" || state === "rate_limited") void checkRoute(route.id);
                return;
              }
              if (
                e.key === "ArrowRight" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowUp"
              ) {
                e.preventDefault();
                const other = ROUTES[(index + 1) % ROUTES.length];
                cardRefs.current[other.id]?.focus();
                select(other.id);
              }
            }}
            className={`group relative flex h-full w-full select-none flex-col rounded-2xl border p-5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-mint-500/40 ${
              selectable || selected ? "cursor-pointer" : "cursor-not-allowed"
            } ${borderCls} ${bgCls} ${shadowCls}`}
          >
            {/* Portal artwork + selected indicator */}
            <span className="flex items-start justify-between">
              <MiniPortalArt route={route.id} />
              <span
                aria-hidden
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${
                  selected
                    ? "border-mint-500 bg-mint-500 text-snow shadow-glow-mint"
                    : "border-night-600 bg-paper text-transparent group-hover:border-mint-500/40"
                }`}
              >
                <Icon name="check" size={13} />
              </span>
            </span>
            <Badge tone={route.id === "pump" ? "mint" : "ice"}>
              {route.id === "pump" ? "Path 01 · Pump.fun" : "Path 02 · Raydium LaunchLab"}
            </Badge>
            <h3 className="mt-3 font-display text-base font-bold text-ink">{route.label}</h3>
            <div id={`route-availability-${route.id}`} className="mt-2 flex-1">
              {state === "loading" && <Spinner label={AVAILABILITY_COPY.loading} />}
              {state === "ready" && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-mint-700">
                  <Icon name="check" size={13} />
                  {AVAILABILITY_COPY.ready}
                </p>
              )}
              {state === "retry" && (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-night-400">
                    <Icon name="clock" size={13} />
                    {AVAILABILITY_COPY.retry}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void checkRoute(route.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-night-700 px-2.5 py-1 text-2xs font-medium text-mint-700 transition-colors duration-200 hover:border-mint-500/60 hover:bg-sky-50"
                  >
                    <Icon name="refresh" size={12} />
                    Retry availability check
                  </button>
                </>
              )}
              {state === "rate_limited" && (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-warn">
                    <Icon name="clock" size={13} />
                    {AVAILABILITY_COPY.rate_limited}
                  </p>
                  {(autoRetryRef.current[route.id]?.attempts ?? 0) >= 4 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void checkRoute(route.id);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-night-700 px-2.5 py-1 text-2xs font-medium text-mint-700 transition-colors duration-200 hover:border-mint-500/60 hover:bg-sky-50"
                    >
                      <Icon name="refresh" size={12} />
                      Retry availability check
                    </button>
                  )}
                </>
              )}
              {state === "unsupported" && (
                <p className="flex items-start gap-1.5 text-xs font-medium text-night-400">
                  <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                  {AVAILABILITY_COPY.unsupported}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
