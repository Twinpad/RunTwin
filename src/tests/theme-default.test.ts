// @vitest-environment jsdom
/**
 * Theme default tests — Dark Mode is TwinPad's default.
 * Covers: first visit (no saved preference) → Dark; a saved "light"/"dark"/
 * "system" preference always wins over the default; System follows the OS
 * (mocked matchMedia); switching persists to localStorage and is restored on
 * the next mount; and the pre-paint bootstrap in layout.tsx keeps its dark
 * fallback (source pin — the anti-flash literal must never regress to
 * light).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ThemeProvider, useTheme } from "@/components/theme/theme-provider";

function Probe() {
  const { theme, resolvedTheme, mounted } = useTheme();
  return createElement("div", {
    "data-testid": "probe",
    "data-theme": theme,
    "data-resolved": resolvedTheme,
    "data-mounted": String(mounted),
    "data-html-dark": document.documentElement.classList.contains("dark") ? "1" : "0",
  });
}

function renderProbe() {
  return render(createElement(ThemeProvider, null, createElement(Probe)));
}

const probe = () => screen.getByTestId("probe");

let capturedSetTheme: ((t: "light" | "dark" | "system") => void) | null = null;

function SetterProbe() {
  const { setTheme } = useTheme();
  capturedSetTheme = setTheme;
  return createElement(
    "button",
    { "data-testid": "set-light", onClick: () => setTheme("light") },
    "set light",
  );
}

function mockMatchMedia(matchesDark: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    ((query: string) =>
      ({
        matches: matchesDark && query.includes("dark"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList) as typeof window.matchMedia,
  );
}

beforeEach(() => {
  localStorage.clear();
  capturedSetTheme = null;
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("theme default — Dark Mode first", () => {
  it("defaults to Dark when no preference is saved (first visit)", async () => {
    expect(localStorage.getItem("twinpad-theme")).toBeNull();
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-theme")).toBe("dark");
    expect(probe().getAttribute("data-resolved")).toBe("dark");
    expect(probe().getAttribute("data-html-dark")).toBe("1");
    // The default is never written to storage — it stays a pure default.
    expect(localStorage.getItem("twinpad-theme")).toBeNull();
  });

  it("a saved light preference wins over the default", async () => {
    localStorage.setItem("twinpad-theme", "light");
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-theme")).toBe("light");
    expect(probe().getAttribute("data-resolved")).toBe("light");
    expect(probe().getAttribute("data-html-dark")).toBe("0");
  });

  it("a saved dark preference stays dark", async () => {
    localStorage.setItem("twinpad-theme", "dark");
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-resolved")).toBe("dark");
    expect(probe().getAttribute("data-html-dark")).toBe("1");
  });

  it("a saved system preference follows the OS (dark OS → dark)", async () => {
    localStorage.setItem("twinpad-theme", "system");
    mockMatchMedia(true);
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-theme")).toBe("system");
    expect(probe().getAttribute("data-resolved")).toBe("dark");
  });

  it("a saved system preference follows the OS (light OS → light)", async () => {
    localStorage.setItem("twinpad-theme", "system");
    mockMatchMedia(false);
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-resolved")).toBe("light");
    expect(probe().getAttribute("data-html-dark")).toBe("0");
  });

  it("switching to light persists and is restored on the next mount", async () => {
    render(
      createElement(ThemeProvider, null, createElement(SetterProbe)),
    );
    await waitFor(() => expect(capturedSetTheme).not.toBeNull());
    fireEvent.click(screen.getByTestId("set-light"));
    expect(localStorage.getItem("twinpad-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    // Next visit: the saved preference is restored (no default override).
    cleanup();
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-resolved")).toBe("light");
  });

  it("switching back to dark restores dark on the next mount", async () => {
    localStorage.setItem("twinpad-theme", "dark");
    renderProbe();
    await waitFor(() => expect(probe().getAttribute("data-mounted")).toBe("true"));
    expect(probe().getAttribute("data-resolved")).toBe("dark");
  });

  it("the pre-paint bootstrap in layout.tsx defaults to dark (source pin)", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "app", "layout.tsx"),
      "utf8",
    );
    // Invalid/missing stored values fall back to dark — never light.
    expect(source).toContain('t==="dark"');
    expect(source).not.toContain('t="light"');
    // The server-rendered <html> ships with the dark class (pre-script paint).
    expect(source).toMatch(/className=\{`dark /);
    // Storage key unchanged — existing saved preferences keep working.
    expect(source).toContain("twinpad-theme");
  });
});
