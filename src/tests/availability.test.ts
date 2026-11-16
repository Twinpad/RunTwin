import { describe, expect, it } from "vitest";
import { classifyAvailabilityError, AVAILABILITY_COPY } from "@/lib/adapters/availability";
import { PumpAdapter } from "@/lib/adapters/pump";
import { LaunchLabAdapter } from "@/lib/adapters/launchlab";
import { TwinpadError } from "@/lib/connection";
import type { Connection } from "@solana/web3.js";

/**
 * Availability classification + honest adapter error codes — no network.
 * The adapters' loadConfig must distinguish TRANSPORT failures (retryable)
 * from PROTOCOL answers (genuinely unavailable on this cluster), and the
 * classifier must never expose raw error text.
 */
describe("classifyAvailabilityError", () => {
  it("maps PROTOCOL to unsupported", () => {
    const out = classifyAvailabilityError(new TwinpadError("PROTOCOL", "config account not found"));
    expect(out.state).toBe("unsupported");
    expect(out.message).toBe(AVAILABILITY_COPY.unsupported);
  });

  it("maps every TwinpadError non-protocol code to retry", () => {
    for (const code of ["RPC_ERROR", "UNKNOWN", "VALIDATION"] as const) {
      const out = classifyAvailabilityError(new TwinpadError(code, "whatever"));
      expect(out.state).toBe("retry");
      expect(out.message).toBe(AVAILABILITY_COPY.retry);
    }
  });

  it("maps transport-shaped raw errors to retry", () => {
    for (const msg of [
      "TypeError: fetch failed",
      "Failed to fetch",
      "connect ECONNREFUSED 127.0.0.1:3300",
    ]) {
      const out = classifyAvailabilityError(new Error(msg));
      expect(out.state).toBe("retry");
    }
  });

  it("maps provider rate limiting to the distinct rate_limited state", () => {
    for (const msg of [
      "429 Too Many Requests",
      "RPC circuit open — provider repeatedly rate-limiting or failing.",
      "Your app has exceeded its compute units per second capacity",
    ]) {
      const out = classifyAvailabilityError(new Error(msg));
      expect(out.state).toBe("rate_limited");
      expect(out.message).toBe(AVAILABILITY_COPY.rate_limited);
    }
  });

  it("classifies through the cause chain (gateway errors wrapped by adapters)", () => {
    const gatewayErr = new Error("RPC circuit open — provider repeatedly rate-limiting or failing.");
    const wrapped = new TwinpadError("RPC_ERROR", "Could not reach the Solana RPC.", gatewayErr);
    const out = classifyAvailabilityError(wrapped);
    expect(out.state).toBe("rate_limited");
  });

  it("fails safe on unknown error shapes (retry, never unsupported)", () => {
    const out = classifyAvailabilityError(new Error("Something completely unexpected happened"));
    expect(out.state).toBe("retry");
    // The raw error text must never become the user-facing message.
    expect(out.message).not.toContain("unexpected");
  });
});

function stubConnection(getAccountInfo: (...a: unknown[]) => Promise<unknown>): Connection {
  return { getAccountInfo, getParsedAccountInfo: async () => null } as unknown as Connection;
}

describe("PumpAdapter.loadConfig classification", () => {
  it("reports an RPC error (not 'not deployed') when the transport fails", async () => {
    const conn = stubConnection(async () => {
      throw new Error("TypeError: fetch failed");
    });
    await expect(new PumpAdapter().loadConfig(conn, "mainnet-beta")).rejects.toMatchObject({
      code: "RPC_ERROR",
    });
  });

  it("reports PROTOCOL when the Global account genuinely does not exist", async () => {
    const conn = stubConnection(async () => null);
    await expect(new PumpAdapter().loadConfig(conn, "mainnet-beta")).rejects.toMatchObject({
      code: "PROTOCOL",
    });
  });
});

describe("LaunchLabAdapter.loadConfig classification", () => {
  it("reports an RPC error (not 'not configured') when the transport fails", async () => {
    const conn = stubConnection(async () => {
      throw new Error("fetch failed");
    });
    await expect(new LaunchLabAdapter().loadConfig(conn, "mainnet-beta")).rejects.toMatchObject({
      code: "RPC_ERROR",
    });
  });

  it("reports PROTOCOL when the config account genuinely does not exist", async () => {
    const conn = stubConnection(async () => null);
    await expect(new LaunchLabAdapter().loadConfig(conn, "mainnet-beta")).rejects.toMatchObject({
      code: "PROTOCOL",
    });
  });
});
