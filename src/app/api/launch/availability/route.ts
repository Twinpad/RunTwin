import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/adapters";
import {
  classifyAvailabilityError,
  readyAvailability,
  type RouteAvailability,
} from "@/lib/adapters/availability";
import { getConnectionForPool, resolveServerNetworkConfig } from "@/lib/connection";
import { gatewayHealthy, gatewayRetryAfterSeconds } from "@/lib/rpc/rpc-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/launch/availability?route=pump|launchlab
 *
 * Server-side launch-route availability check. Runs the route adapter's real
 * mainnet readiness path (loadConfig over the shared gateway) on a small
 * DEDICATED gateway pool ("availability") so a user opening the Create page
 * never queues behind the background live-market engine's provider traffic,
 * and never fails because the primary pool's circuit breaker is open.
 *
 * Response: { route, cluster, state, message, details?, retryAfterSeconds? }
 * States mirror lib/adapters/availability.ts (ready/retry/rate_limited/
 * unsupported). No secrets, no raw RPC error text.
 */

const routeSchema = z.enum(["pump", "launchlab"]);

const CACHE_MS = 5_000;
const cache = new Map<string, { at: number; payload: RouteAvailability }>();

function cacheKey(route: string, cluster: string): string {
  return `${route}:${cluster}`;
}

function classifyServerCheck(err: unknown): RouteAvailability {
  const classified = classifyAvailabilityError(err);
  // rate_limited carries the gateway's own Retry-After when known.
  if (classified.state === "rate_limited") {
    return { ...classified, retryAfterSeconds: gatewayRetryAfterSeconds("availability") };
  }
  return classified;
}

export async function GET(req: NextRequest) {
  const route = routeSchema.safeParse(req.nextUrl.searchParams.get("route"));
  if (!route.success) {
    return NextResponse.json(
      { error: "invalid_route", message: "route must be 'pump' or 'launchlab'." },
      { status: 400 },
    );
  }
  const routeId = route.data;
  const cluster = resolveServerNetworkConfig(process.env.NEXT_PUBLIC_TWINPAD_NETWORK).cluster;
  const key = cacheKey(routeId, cluster);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ route: routeId, cluster, ...hit.payload });
  }

  // Honest fast-path: when this pool's own circuit is open, report the
  // rate-limited state (with the breaker's Retry-After) without adding load.
  if (!gatewayHealthy("availability")) {
    const payload: RouteAvailability = {
      state: "rate_limited",
      message: "The Solana RPC is rate-limited right now. Retrying automatically…",
      retryAfterSeconds: gatewayRetryAfterSeconds("availability"),
    };
    cache.set(key, { at: Date.now(), payload });
    return NextResponse.json({ route: routeId, cluster, ...payload });
  }

  try {
    const adapter = await getAdapter(routeId);
    const conn = getConnectionForPool(
      resolveServerNetworkConfig(process.env.NEXT_PUBLIC_TWINPAD_NETWORK),
      "availability",
    );
    const config = await adapter.loadConfig(conn, cluster as never);
    const payload: RouteAvailability = {
      ...readyAvailability(),
      details: [
        ...adapter.describePrograms(cluster as never).map((p) => `${p.name}: ${p.address}`),
        // Flatten one level so nested config objects render as readable
        // key: value facts (never "[object Object]").
        ...Object.entries(config.details).flatMap(([k, v]) => {
          if (v === null || v === undefined) return [];
          if (typeof v === "object") {
            return Object.entries(v as Record<string, unknown>)
              .filter(
                ([, v2]) => typeof v2 === "string" || typeof v2 === "number" || typeof v2 === "boolean",
              )
              .map(([k2, v2]) => `${k}.${k2}: ${String(v2)}`);
          }
          return [`${k}: ${String(v)}`];
        }),
      ],
    };
    cache.set(key, { at: Date.now(), payload });
    return NextResponse.json({ route: routeId, cluster, ...payload });
  } catch (err) {
    // One server-side log line with the classification only — never raw error
    // text, never credentials.
    const payload = classifyServerCheck(err);
    console.error(
      `[launch/availability] route=${routeId} cluster=${cluster} state=${payload.state}`,
    );
    cache.set(key, { at: Date.now(), payload });
    return NextResponse.json({ route: routeId, cluster, ...payload });
  }
}
