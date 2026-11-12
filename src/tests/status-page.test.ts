// @vitest-environment jsdom
/**
 * Status page RPC-panel tests (connection mocked — no network).
 * Covers: Connected with slot/latency/last-success, honest Unreachable
 * (no slot/latency values, friendly error, no raw internals), the Retry
 * action, and the proxy-unconfigured message.
 * Written with React.createElement (no JSX) so the file stays a `.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const conn = vi.hoisted(() => ({
  getSlot: vi.fn<(...a: unknown[]) => Promise<unknown>>(),
  rpcEndpoint: "/api/rpc",
}));

vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({ connection: conn }),
}));

import StatusPage from "@/app/status/page";

/** Value cell of a labeled row (label span's next sibling). */
function rowValue(label: string): string {
  return screen.getByText(label).nextElementSibling?.textContent ?? "";
}

beforeEach(() => {
  conn.getSlot.mockReset();
  conn.rpcEndpoint = "/api/rpc";
  process.env.NEXT_PUBLIC_TWINPAD_NETWORK = "mainnet-beta";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StatusPage — RPC connection panel", () => {
  it("shows Connected with a real slot, latency, and last-success time", async () => {
    conn.getSlot.mockResolvedValue(1234567);
    render(createElement(StatusPage));
    await waitFor(() => expect(screen.getByText("Connected")).toBeTruthy());
    // Slot value is locale-formatted — compare digits only.
    expect(rowValue("Slot").replace(/[^0-9]/g, "")).toBe("1234567");
    expect(rowValue("Latency")).toMatch(/ms/);
    expect(rowValue("Last successful connection")).not.toBe("—");
    // No placeholders anywhere while connected.
    expect(screen.queryAllByText("—").length).toBe(0);
  });

  it("shows Unreachable honestly: em-dashes, friendly message, no raw internals", async () => {
    conn.getSlot.mockRejectedValue(new Error("TypeError: fetch failed"));
    render(createElement(StatusPage));
    await waitFor(() => expect(screen.getByText("Unreachable")).toBeTruthy());
    // Slot, latency and last-success are all placeholders while unreachable.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/could not be reached/)).toBeTruthy();
    // The raw error text must never be rendered.
    expect(screen.queryByText(/fetch failed/)).toBeNull();
  });

  it("maps a missing proxy configuration to the actionable message", async () => {
    conn.getSlot.mockRejectedValue(new Error("503 rpc_proxy_not_configured"));
    render(createElement(StatusPage));
    await waitFor(() => expect(screen.getByText(/not configured on this deployment/)).toBeTruthy());
  });

  it("Retry re-runs the check and recovers to Connected", async () => {
    conn.getSlot.mockRejectedValueOnce(new Error("429 Too Many Requests"));
    conn.getSlot.mockResolvedValueOnce(7654321);
    render(createElement(StatusPage));
    await waitFor(() => expect(screen.getByText("Unreachable")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Retry check/ }));
    await waitFor(() => expect(screen.getByText("Connected")).toBeTruthy());
    expect(rowValue("Slot").replace(/[^0-9]/g, "")).toBe("7654321");
    expect(conn.getSlot).toHaveBeenCalledTimes(2);
  });

  it("treats a non-numeric slot response as an invalid response, not success", async () => {
    conn.getSlot.mockResolvedValue("not-a-slot");
    render(createElement(StatusPage));
    await waitFor(() => expect(screen.getByText("Unreachable")).toBeTruthy());
    expect(screen.getByText(/invalid response/)).toBeTruthy();
  });
});
