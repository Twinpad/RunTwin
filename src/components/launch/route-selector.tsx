"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Connection } from "@solana/web3.js";
import { getAdapter, ROUTES } from "@/lib/adapters";
import type { LaunchRoute } from "@/lib/adapters/types";
import {
  AVAILABILITY_COPY,
  classifyAvailabilityError,
  loadingAvailability,
  readyAvailability,
  type RouteAvailability,
} from "@/lib/adapters/availability";
import { Badge, Spinner } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icons";

type AvailabilityMap = Partial<Record<LaunchRoute, RouteAvailability>>;

/** Mini launch-portal artwork — CSS conic swirl in the route's colorway. */
function MiniPortalArt({ route }: { route: LaunchRoute }) {
  const ring =
    route === "pump"
      ? "from-cyan-400 via-teal-300 to-emerald-400"
      : "from-violet-500 via-fuchsia-400 to-pink-400";
  return (
    <span aria-hidden className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      <span
        className={`tp-portal-spin absolute inset-0 rounded-full bg-gradient-to-br ${ring} opacity-90`}
        style={{ padding: 4 }}
      >
        <span className="block h-full w-full rounded-full bg-paper dark:bg-[#1D1442]" />
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
 * covering its whole surface. Availability is checked live per route and
 * shown honestly: loading → ready → retry (transient RPC trouble) /
 * unsupported (route genuinely not deployed on this cluster). A route that
 * is not ready cannot be selected, raw errors are never rendered, and a
 * Retry action re-runs the check.
 */
export function RouteSelector({
  value,
  onChange,
  connection,
  cluster,
  onAvailabilityChange,
}: {
  value: LaunchRoute;
  onChange: (r: LaunchRoute) => void;
  connection: Connection;
  cluster: string;
  /** Optional: report the live availability map (for Continue gating). */
  onAvailabilityChange?: (map: AvailabilityMap) => void;
}) {
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const runIdRef = useRef(0);
  const cardRefs = useRef<Partial<Record<LaunchRoute, HTMLDivElement | null>>>({});

  const check = useCallback(async () => {
    const runId = ++runIdRef.current;
    setAvailability(Object.fromEntries(ROUTES.map((r) => [r.id, loadingAvailability()])));
    const out: AvailabilityMap = {};
    await Promise.all(
      ROUTES.map(async (route) => {
        try {
          const adapter = await getAdapter(route.id);
          const config = await adapter.loadConfig(connection, cluster as never);
          out[route.id] = {
            ...readyAvailability(),
            details: [
              ...adapter.describePrograms(cluster as never).map((p) => `${p.name}: ${p.address}`),
              ...Object.entries(config.details)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([k, v]) => `${k}: ${String(v)}`),
            ],
          };
        } catch (err) {
          // Detailed diagnostics stay in the console — never rendered in the
          // card. The user sees only the honest short message.
          console.error(`[route-selector] ${route.id} availability check failed:`, err);
          out[route.id] = classifyAvailabilityError(err);
        }
      }),
    );
    if (runIdRef.current === runId) setAvailability(out);
  }, [connection, cluster]);

  useEffect(() => {
    void check();
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
                else if (state === "retry") void check();
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
              {route.id === "pump" ? "Route 01 · Pump.fun" : "Route 02 · Raydium LaunchLab"}
            </Badge>
            <h3 className="mt-3 font-display text-base font-bold text-ink">{route.label}</h3>
            <div id={`route-availability-${route.id}`} className="mt-2 flex-1">
              {state === "loading" && <Spinner label={AVAILABILITY_COPY.loading} />}
              {state === "ready" && (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-mint-700">
                    <Icon name="check" size={13} />
                    {AVAILABILITY_COPY.ready}
                  </p>
                  {(availability[route.id]?.details ?? []).length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-2xs leading-4 text-night-500">
                      {(availability[route.id]?.details ?? []).map((d, i) => (
                        <li key={i} className="break-all">
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
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
                      void check();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-night-700 px-2.5 py-1 text-2xs font-medium text-mint-700 transition-colors duration-200 hover:border-mint-500/60 hover:bg-sky-50"
                  >
                    <Icon name="refresh" size={12} />
                    Retry availability check
                  </button>
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
