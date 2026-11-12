"use client";

/**
 * TwinPad application shell — floating 3D Navigation Dock + floating top
 * bar over the page content. The dock owns desktop AND mobile navigation
 * (bottom dock + expandable sheet), replacing the old collapsible sidebar.
 */

import { NavDock } from "./nav-dock";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavDock />
      <div className="flex min-h-screen flex-col md:pl-[100px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-3 pb-28 pt-3 sm:px-5 md:pb-6">{children}</main>
        <footer className="mb-24 hidden px-4 pb-4 md:mb-2 md:block">
          <div className="rounded-2xl bg-gradient-to-r from-[#4C1D95] via-[#7C3AED] to-[#06B6D4] px-4 py-4 text-center shadow-glow-mint">
            <p className="font-display text-sm font-extrabold text-white">
              TwinPad — One Launchpad. Two Routes.
            </p>
            <p className="mt-1 text-2xs text-white/75">
              Fun to explore. Powerful to launch. Launches involve risk; verify every transaction before signing.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
