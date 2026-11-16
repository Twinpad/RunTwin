// @vitest-environment jsdom
/**
 * RouteSelector UI-state tests (server availability endpoint mocked — no
 * network). The component now checks availability SERVER-SIDE via
 * GET /api/launch/availability?route=…; these tests mock that fetch and
 * cover: radio semantics, loading/ready/retry/rate_limited/unsupported
 * states, honest messages (no raw errors in the DOM), per-route
 * independence, automatic retry under provider rate limiting, keyboard
 * selection, and the availability callback the create page uses to gate
 * Continue. Written with React.createElement (no JSX) so the file stays a
 * `.test.ts` (project vitest include pattern).
 */
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouteSelector } from "@/components/launch/route-selector";

type EndpointState = {
  state: "ready" | "retry" | "rate_limited" | "unsupported";
  message: string;
  details?: string[];
  retryAfterSeconds?: number;
};

const mocks = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

const READY_PUMP: EndpointState = {
  state: "ready",
  message: "Ready to launch",
  details: ["pump program: ADDR-PUMP"],
};
const READY_LAB: EndpointState = {
  state: "ready",
  message: "Ready to launch",
  details: ["launchlab program: ADDR-LAB"],
};

function respond(responses: Record<string, EndpointState>) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = url.includes("route=pump") ? "pump" : url.includes("route=launchlab") ? "launchlab" : "";
    const r = responses[route];
    if (!r) throw new Error(`no mock for ${url}`);
    return {
      ok: true,
      status: 200,
      json: async () => ({ route, cluster: "mainnet-beta", ...r }),
    } as Response;
  };
}

function renderSelector(value: "pump" | "launchlab" = "pump", onChange = vi.fn(), onAvailability = vi.fn()) {
  return render(
    createElement(RouteSelector, {
      value,
      onChange,
      cluster: "mainnet-beta",
      onAvailabilityChange: onAvailability,
    }),
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.fetchMock.mockImplementation(respond({ pump: READY_PUMP, launchlab: READY_LAB }));
  vi.stubGlobal("fetch", mocks.fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const cards = () => screen.getAllByRole("radio");
const cardFor = (label: string) => cards().find((el) => el.textContent?.includes(label))!;

describe("RouteSelector — states", () => {
  it("shows the loading message while availability is checked", async () => {
    mocks.fetchMock.mockImplementation(() => new Promise(() => {}));
    renderSelector();
    expect(screen.getAllByText("Checking launch availability…").length).toBe(2);
    expect(screen.queryByText("Ready to launch")).toBeNull();
    expect(screen.queryByText("unavailable")).toBeNull();
  });

  it("shows Ready to launch with details when both routes verify", async () => {
    renderSelector();
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2));
    expect(screen.getAllByText(/ADDR-(PUMP|LAB)/).length).toBeGreaterThan(0);
    for (const card of cards()) expect(card.getAttribute("aria-disabled")).toBe("false");
    // Two independent endpoint calls (one per route).
    expect(mocks.fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows unsupported — never raw errors — for a PROTOCOL answer", async () => {
    mocks.fetchMock.mockImplementation(
      respond({
        pump: { state: "unsupported", message: "This launch route is not supported on the selected network." },
        launchlab: READY_LAB,
      }),
    );
    renderSelector("pump");
    await waitFor(() => expect(screen.getAllByText(/not supported on the selected network/).length).toBe(1));
    // One failing route must NOT disable the unrelated route.
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(1));
  });

  it("shows the generic retry state with a per-route Retry button", async () => {
    mocks.fetchMock.mockImplementation(
      respond({
        pump: { state: "retry", message: "Temporarily unavailable. Please try again." },
        launchlab: READY_LAB,
      }),
    );
    renderSelector("pump");
    await waitFor(() => expect(screen.getAllByText("Temporarily unavailable. Please try again.").length).toBe(1));
    const retryButtons = screen.getAllByText("Retry availability check");
    expect(retryButtons.length).toBe(1);
    // Retry re-checks only that route.
    fireEvent.click(retryButtons[0]);
    await waitFor(() => expect(mocks.fetchMock).toHaveBeenCalledTimes(3));
  });

  it("maps provider rate limiting to the dedicated rate_limited state", async () => {
    mocks.fetchMock.mockImplementation(
      respond({
        pump: {
          state: "rate_limited",
          message: "The Solana RPC is rate-limited right now. Retrying automatically…",
          retryAfterSeconds: 4,
        },
        launchlab: READY_LAB,
      }),
    );
    renderSelector("pump");
    await waitFor(() =>
      expect(screen.getAllByText("The Solana RPC is rate-limited right now. Retrying automatically…").length).toBe(1),
    );
    // The other route is unaffected.
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(1));
  });
});

describe("RouteSelector — automatic retry under rate limiting", () => {
  it("retries the rate-limited route automatically (bounded) and recovers", async () => {
    let calls = 0;
    mocks.fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("route=pump")) {
        calls += 1;
        const state: EndpointState =
          calls === 1
            ? {
                state: "rate_limited",
                message: "The Solana RPC is rate-limited right now. Retrying automatically…",
                retryAfterSeconds: 1,
              }
            : READY_PUMP;
        return { ok: true, status: 200, json: async () => ({ route: "pump", cluster: "mainnet-beta", ...state }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ route: "launchlab", cluster: "mainnet-beta", ...READY_LAB }) } as Response;
    });
    renderSelector("pump");
    // Initial check: pump rate-limited, launchlab ready.
    await waitFor(() =>
      expect(screen.getAllByText("The Solana RPC is rate-limited right now. Retrying automatically…").length).toBe(1),
    );
    expect(mocks.fetchMock).toHaveBeenCalledTimes(2);
    // The rate-limited route retries automatically (real ~4s backoff) and
    // recovers to ready.
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2), { timeout: 15_000 });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("RouteSelector — selection semantics", () => {
  it("marks exactly one radio checked and switches on click", async () => {
    const onChange = vi.fn();
    const view = renderSelector("pump", onChange);
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2));
    expect(cardFor("Pump.fun → PumpSwap").getAttribute("aria-checked")).toBe("true");
    expect(cardFor("LaunchLab → CPMM").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(cardFor("LaunchLab → CPMM"));
    expect(onChange).toHaveBeenCalledWith("launchlab");
    // Controlled component: parent re-renders with the new value (no re-check).
    view.rerender(
      createElement(RouteSelector, {
        value: "launchlab",
        onChange,
        cluster: "mainnet-beta",
      }),
    );
    await waitFor(() => expect(cardFor("LaunchLab → CPMM").getAttribute("aria-checked")).toBe("true"));
    expect(cardFor("Pump.fun → PumpSwap").getAttribute("aria-checked")).toBe("false");
  });

  it("selects with Enter and Space and moves with arrow keys", async () => {
    const onChange = vi.fn();
    renderSelector("pump", onChange);
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2));
    const pumpCard = cardFor("Pump.fun → PumpSwap");
    const labCard = cardFor("LaunchLab → CPMM");
    fireEvent.keyDown(pumpCard, { key: " " });
    expect(onChange).toHaveBeenCalledWith("pump");
    fireEvent.keyDown(labCard, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("launchlab");
    // Arrows move focus to the other card (WAI-ARIA radio pattern).
    pumpCard.focus();
    fireEvent.keyDown(pumpCard, { key: "ArrowRight" });
    await waitFor(() => expect(document.activeElement).toBe(labCard));
    expect(onChange).toHaveBeenCalledWith("launchlab");
  });

  it("applies the selected styling and hover styling hooks", async () => {
    renderSelector("pump");
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2));
    const pumpCard = cardFor("Pump.fun → PumpSwap");
    const labCard = cardFor("LaunchLab → CPMM");
    expect(pumpCard.className).toContain("border-mint-500");
    expect(pumpCard.className).toContain("shadow-glow-mint");
    expect(pumpCard.className).toContain("ring-2");
    expect(labCard.className).toContain("hover:border-mint-500/60");
    expect(labCard.className).toContain("hover:bg-sky-50");
    expect(labCard.className).toContain("hover:shadow-glow-mint");
    expect(labCard.className).toContain("cursor-pointer");
    expect(pumpCard.className).toContain("focus-visible:ring-2");
  });

  it("reports the availability map for Continue gating", async () => {
    const onAvailability = vi.fn();
    renderSelector("pump", vi.fn(), onAvailability);
    await waitFor(() =>
      expect(
        onAvailability.mock.calls.some(
          ([m]) =>
            (m as Record<string, { state: string }>)?.pump?.state === "ready" &&
            (m as Record<string, { state: string }>)?.launchlab?.state === "ready",
        ),
      ).toBe(true),
    );
  });
});
