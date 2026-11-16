// @vitest-environment jsdom
/**
 * Topbar social-links regression tests.
 *
 * TwinPad's OFFICIAL accounts are https://x.com/RunOnTwin and
 * https://github.com/Twinpad (both verified by the project owner). These
 * tests pin that behavior: the header renders exactly those two links —
 * new-tab + noreferrer — and never any legacy-brand or placeholder social
 * accounts (including any predecessor brand's accounts).
 * Wallet/connection/navigation modules are mocked at the boundary; the real
 * Topbar renders.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";

afterEach(cleanup);

const walletState = vi.hoisted(() => ({
  publicKey: null as { toBase58: () => string } | null,
  wallet: null as { adapter: { name: string } } | null,
  connecting: false,
  disconnect: vi.fn(),
  select: vi.fn(),
  wallets: [] as { adapter: { name: string; url: string; icon: string }; readyState: string }[],
  connection: { getSlot: vi.fn(async () => 123) },
}));

vi.mock("@solana/wallet-adapter-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/wallet-adapter-react")>();
  return {
    ...actual,
    useWallet: () => walletState,
    useConnection: () => ({ connection: walletState.connection }),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { Topbar } from "@/components/layout/topbar";
import { WalletModalProvider } from "@/components/wallet/wallet-modal";

function renderTopbar() {
  return render(
    createElement(
      WalletModalProvider,
      null,
      createElement(Topbar, { onMenu: () => undefined }),
    ),
  );
}

describe("topbar social links (official X and GitHub)", () => {
  it("renders exactly the two official social links", () => {
    renderTopbar();
    const x = screen.getByRole("link", { name: "TwinPad on X" });
    const gh = screen.getByRole("link", { name: "TwinPad on GitHub" });
    expect(x.getAttribute("href")).toBe("https://x.com/RunOnTwin");
    expect(gh.getAttribute("href")).toBe("https://github.com/Twinpad");
    expect(x.getAttribute("target")).toBe("_blank");
    expect(gh.getAttribute("target")).toBe("_blank");
    expect(x.getAttribute("rel")).toBe("noopener noreferrer");
    expect(gh.getAttribute("rel")).toBe("noopener noreferrer");
    expect(x.getAttribute("title")).toBe("Follow TwinPad on X");
    expect(gh.getAttribute("title")).toBe("Visit TwinPad on GitHub");
  });

  it("never links any legacy-brand or placeholder social accounts", () => {
    renderTopbar();
    const hrefs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => /^https?:\/\//.test(h));
    const official = new Set([
      "https://x.com/RunOnTwin",
      "https://github.com/Twinpad",
    ]);
    for (const href of hrefs) {
      expect(href).not.toContain("DotPad");
      expect(href).not.toContain("RelayPad");
      expect(href).not.toContain("dotpad");
      expect(href).not.toContain("relaypad");
      expect(href).not.toContain("Usetwinpad");
      expect(href).not.toContain("TwinPadFun");
      // github.com / x.com profiles must be exactly the two official accounts.
      if (href.startsWith("https://github.com/") || href.startsWith("https://x.com/")) {
        expect(official.has(href)).toBe(true);
      }
    }
  });

  it("keeps the Connect Wallet action in the top-right group", () => {
    renderTopbar();
    const connect = screen.getByRole("button", { name: /connect/i });
    // WalletButton wraps its own button; the shared top-right group is the
    // nearest ancestor with the ml-auto layout class.
    const group = connect.closest(".ml-auto");
    expect(group).not.toBeNull();
  });
});

