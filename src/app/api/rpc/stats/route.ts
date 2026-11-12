import { NextResponse } from "next/server";
import {
  gatewayHealthy,
  gatewayRetryAfterSeconds,
  rpcGatewayMetrics,
  rpcGatewayPoolsOverview,
} from "@/lib/rpc/rpc-gateway";

export const dynamic = "force-dynamic";

/**
 * GET /api/rpc/stats — safe gateway diagnostics for development and status
 * monitoring. Exposes request/429/retry/cache/coalesce/stale counters, the
 * circuit state, and the upstream HOSTNAME only. Never includes URLs, API
 * keys, or auth material.
 */
export async function GET() {
  return NextResponse.json(
    {
      healthy: gatewayHealthy(),
      retryAfterSeconds: gatewayRetryAfterSeconds(),
      pools: rpcGatewayPoolsOverview(),
      primary: rpcGatewayMetrics(),
      generatedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
