// @vitest-environment jsdom
/**
 * RouteSelector UI-state tests (adapters mocked — no network).
 * Covers: radio semantics, loading/ready/retry/unsupported states, honest
 * messages (no raw errors in the DOM), hover/selected styling hooks,
 * keyboard selection, retry, switching, and the availability callback the
 * create page uses to gate Continue. Written with React.createElement (no
 * JSX) so the file stays a `.test.ts` (project vitest include pattern).
 */
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouteSelector } from "@/components/launch/route-selector";
import { TwinpadError } from "@/lib/connection";

const mocks = vi.hoisted(() => {
  const loadConfigs: Record<string, ReturnType<typeof vi.fn>> = {};
  return {
    loadConfigs,
    getAdapter: vi.fn(async (id: string) => ({
      id,
      describePrograms: () => [{ name: `${id} program`, address: `ADDR-${id}` }],
      loadConfig: loadConfigs[id],
    })),
  };
});

vi.mock("@/lib/adapters", () => ({
  ROUTES: [
    { id: "pump", label: "Pump.fun → PumpSwap" },
    { id: "launchlab", label: "LaunchLab → CPMM" },
  ],
  getAdapter: mocks.getAdapter,
}));

function fakeAdapterCalls(impl: () => Promise<unknown>) {
  return vi.fn(impl);
}

function renderSelector(value: "pump" | "launchlab" = "pump", onChange = vi.fn(), onAvailability = vi.fn()) {
  return render(
    createElement(RouteSelector, {
      value,
      onChange,
      connection: {} as never,
      cluster: "mainnet-beta",
      onAvailabilityChange: onAvailability,
    }),
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.loadConfigs.pump = fakeAdapterCalls(async () => ({ details: { programId: "P1" } }));
  mocks.loadConfigs.launchlab = fakeAdapterCalls(async () => ({ details: { configId: "C1" } }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const cards = () => screen.getAllByRole("radio");
const cardFor = (label: string) => cards().find((el) => el.textContent?.includes(label))!;

describe("RouteSelector — states", () => {
  it("shows the loading message while availability is checked", async () => {
    mocks.loadConfigs.pump = fakeAdapterCalls(() => new Promise(() => {}));
    mocks.loadConfigs.launchlab = fakeAdapterCalls(() => new Promise(() => {}));
    renderSelector();
    expect(screen.getAllByText("Checking launch availability…").length).toBe(2);
    expect(screen.queryByText("Ready to launch")).toBeNull();
    expect(screen.queryByText("unavailable")).toBeNull();
  });

  it("shows Ready to launch with details when both routes verify", async () => {
    renderSelector();
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2));
    expect(screen.getAllByText(/ADDR-(pump|launchlab)/).length).toBeGreaterThan(0);
    for (const card of cards()) expect(card.getAttribute("aria-disabled")).toBe("false");
  });

  it("shows unsupported — never raw errors — for a PROTOCOL failure", async () => {
    mocks.loadConfigs.pump = fakeAdapterCalls(async () => {
      throw new TwinpadError("PROTOCOL", "LaunchLab config account DEADBEEF not found on mainnet-beta.");
    });
    const onChange = vi.fn();
    renderSelector("pump", onChange);
    await waitFor(() => expect(screen.getAllByText(/not supported on the selected network/).length).toBe(1));
    const pumpCard = cardFor("Pump.fun → PumpSwap");
    expect(pumpCard.getAttribute("aria-disabled")).toBe("true");
    // An unavailable route can never appear selected (even if it is the
    // parent's current value) — the selection is visually dropped.
    expect(pumpCard.getAttribute("aria-checked")).toBe("false");
    expect(pumpCard.className).not.toContain("border-mint-500");
    expect(pumpCard.textContent).not.toContain("DEADBEEF");
    expect(pumpCard.className).toContain("cursor-not-allowed");
    // Selecting an unavailable route is refused.
    fireEvent.click(pumpCard);
    expect(onChange).not.toHaveBeenCalled();
    // The healthy route stays selectable.
    fireEvent.click(cardFor("LaunchLab → CPMM"));
    expect(onChange).toHaveBeenCalledWith("launchlab");
  });

  it("shows the retry state with a working Retry action for transport failures", async () => {
    mocks.loadConfigs.launchlab = fakeAdapterCalls(async () => {
      throw new Error("TypeError: fetch failed");
    });
    renderSelector();
    await waitFor(() => expect(screen.getAllByText(/Temporarily unavailable/).length).toBe(1));
    const labCard = cardFor("LaunchLab → CPMM");
    expect(labCard.textContent).not.toContain("fetch failed");
    const retry = screen.getAllByText("Retry availability check").length;
    expect(retry).toBe(1);
    const before = mocks.loadConfigs.launchlab.mock.calls.length;
    fireEvent.click(screen.getByText("Retry availability check"));
    await waitFor(() => expect(mocks.loadConfigs.launchlab.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("RouteSelector — selection semantics", () => {
  it("marks exactly one radio checked and switches on click", async () => {
    const onChange = vi.fn();
    const conn = {} as never;
    const view = render(
      createElement(RouteSelector, {
        value: "pump",
        onChange,
        connection: conn,
        cluster: "mainnet-beta",
      }),
    );
    await waitFor(() => expect(screen.getAllByText("Ready to launch").length).toBe(2));
    expect(cardFor("Pump.fun → PumpSwap").getAttribute("aria-checked")).toBe("true");
    expect(cardFor("LaunchLab → CPMM").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(cardFor("LaunchLab → CPMM"));
    expect(onChange).toHaveBeenCalledWith("launchlab");
    // Controlled component: parent re-renders with the new value (same
    // connection — no re-check).
    view.rerender(
      createElement(RouteSelector, {
        value: "launchlab",
        onChange,
        connection: conn,
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
    // Selected: stronger blue border + persistent glow + ring.
    expect(pumpCard.className).toContain("border-mint-500");
    expect(pumpCard.className).toContain("shadow-glow-mint");
    expect(pumpCard.className).toContain("ring-2");
    // Unselected selectable: blue hover border + brighten + glow + pointer.
    expect(labCard.className).toContain("hover:border-mint-500/60");
    expect(labCard.className).toContain("hover:bg-sky-50");
    expect(labCard.className).toContain("hover:shadow-glow-mint");
    expect(labCard.className).toContain("cursor-pointer");
    // Visible focus styling hook.
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
