// @vitest-environment jsdom
/**
 * Topbar social-links regression tests.
 *
 * TwinPad ships with NO social links: the project has no verified GitHub org
 * or X account, and brand links must never point at accounts the project does
 * not own (including any predecessor brand's accounts). These tests pin that
 * honest behavior so a placeholder link cannot sneak back in.
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

describe("topbar social links (none until verified accounts exist)", () => {
  it("renders no social links at all", () => {
    renderTopbar();
    const links = Array.from(document.querySelectorAll("a[aria-label^='Official TwinPad']"));
    expect(links.length).toBe(0);
  });

  it("never links any legacy-brand or placeholder social accounts", () => {
    renderTopbar();
    const hrefs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => /^https?:\/\//.test(h));
    for (const href of hrefs) {
      expect(href).not.toContain("DotPad");
      expect(href).not.toContain("RelayPad");
      expect(href).not.toContain("dotpad");
      expect(href).not.toContain("relaypad");
      expect(href).not.toContain("Usetwinpad");
      expect(href).not.toContain("TwinPadFun");
      // github.com / x.com profiles are the only legacy-link shapes to guard.
      expect(href.startsWith("https://github.com/")).toBe(false);
      expect(href.startsWith("https://x.com/")).toBe(false);
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
