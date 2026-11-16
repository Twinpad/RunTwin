// @vitest-environment node
/**
 * /api/launch/availability route tests — server-side launch-route readiness.
 * The gateway, connection factory and adapters are mocked; the route handler
 * runs for real. Covers: ready (with verified details), unsupported (protocol
 * answer), rate_limited (circuit open, with Retry-After), invalid routes
 * (400), and the short-TTL cache that dedupes double-checks.
 *
 * The route module is imported FRESH for every test (vi.resetModules + a
 * dynamic import) so its internal short-TTL cache starts empty per test.
 * (Route modules may only export HTTP handlers, so no reset hook is
 * exported from the file itself.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { TwinpadError } from "@/lib/connection";

type RouteModule = typeof import("@/app/api/launch/availability/route");

const mocks = vi.hoisted(() => ({
  loadConfigs: {} as Record<string, ReturnType<typeof vi.fn>>,
  getAdapter: vi.fn(async (id: string) => ({
    id,
    describePrograms: () => [{ name: `${id} program`, address: `ADDR-${id}` }],
    loadConfig: (mocks.loadConfigs[id] ?? vi.fn()),
  })),
  getConnectionForPool: vi.fn(() => ({ __stub: true })),
  gatewayHealthy: vi.fn(() => true),
  gatewayRetryAfterSeconds: vi.fn(() => 4),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapter: mocks.getAdapter,
}));

vi.mock("@/lib/connection", () => ({
  getConnectionForPool: mocks.getConnectionForPool,
  resolveServerNetworkConfig: (envNetwork: string | undefined) => ({
    cluster: envNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet",
    rpcUrl: "https://rpc.test",
    commitment: "confirmed",
    wsUrl: null,
    provider: "custom",
  }),
  TwinpadError: class TwinpadError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "TwinpadError";
      this.code = code;
    }
  },
}));

vi.mock("@/lib/rpc/rpc-gateway", () => ({
  gatewayHealthy: mocks.gatewayHealthy,
  gatewayRetryAfterSeconds: mocks.gatewayRetryAfterSeconds,
}));

async function loadRoute(): Promise<RouteModule> {
  vi.resetModules();
  return import("@/app/api/launch/availability/route");
}

function req(route: string | null) {
  const url = route
    ? `http://localhost:3212/api/launch/availability?route=${route}`
    : "http://localhost:3212/api/launch/availability";
  return new NextRequest(url);
}

beforeEach(() => {
  mocks.loadConfigs.pump = vi.fn(async () => ({
    details: { programId: "PUMP-ID", global: { feeBasisPoints: "100" } },
  }));
  mocks.loadConfigs.launchlab = vi.fn(async () => ({
    details: { programId: "LAB-ID", configId: "CONFIG-ID" },
  }));
  mocks.gatewayHealthy.mockReturnValue(true);
  mocks.gatewayRetryAfterSeconds.mockReturnValue(4);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/launch/availability", () => {
  it("returns ready with verified details for the Pump.fun route", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("pump"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBe("ready");
    expect(body.route).toBe("pump");
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining("PUMP-ID"),
        expect.stringContaining("global.feeBasisPoints: 100"),
      ]),
    );
    expect(mocks.getConnectionForPool).toHaveBeenCalledWith(
      expect.anything(),
      "availability",
    );
  });

  it("returns unsupported when the adapter reports a protocol answer", async () => {
    mocks.loadConfigs.launchlab = vi.fn(async () => {
      throw new TwinpadError("PROTOCOL", "config not found");
    });
    const { GET } = await loadRoute();
    const res = await GET(req("launchlab"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.state).toBe("unsupported");
  });

  it("returns rate_limited with Retry-After while the pool's circuit is open", async () => {
    mocks.gatewayHealthy.mockReturnValue(false);
    mocks.gatewayRetryAfterSeconds.mockReturnValue(7);
    const { GET } = await loadRoute();
    const res = await GET(req("launchlab"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.state).toBe("rate_limited");
    expect(body.retryAfterSeconds).toBe(7);
    // No RPC attempt is made while the circuit is open.
    expect(mocks.loadConfigs.launchlab).not.toHaveBeenCalled();
  });

  it("returns rate_limited when the upstream check fails with a rate-limit error", async () => {
    mocks.loadConfigs.pump = vi.fn(async () => {
      throw Object.assign(new Error("fetch failed"), {
        cause: Object.assign(new Error("Upstream RPC rate-limited (429)."), { code: "RATE_LIMITED" }),
      });
    });
    const { GET } = await loadRoute();
    const res = await GET(req("pump"));
    const body = await res.json();
    expect(body.state).toBe("rate_limited");
  });

  it("rejects unknown routes with 400", async () => {
    const { GET } = await loadRoute();
    const res = await GET(req("solana"));
    expect(res.status).toBe(400);
  });

  it("caches a route's result briefly so double-checks share one upstream check", async () => {
    const { GET } = await loadRoute();
    await GET(req("pump"));
    await GET(req("pump"));
    expect(mocks.loadConfigs.pump).toHaveBeenCalledTimes(1);
  });
});

