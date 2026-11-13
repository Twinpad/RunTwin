"use client";

/**
 * TwinPad application shell — floating 3D Navigation Dock + floating top
 * bar over the page content. The dock owns desktop AND mobile navigation
 * (bottom dock + expandable sheet), replacing the old collapsible sidebar.
 */

import { NavDock } from "./nav-dock";
import { Topbar } from "./topbar";
import { TwinPadLockup, TwinRings } from "@/components/brand/logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavDock />
      <div className="flex min-h-screen flex-col md:pl-[100px]">
        <Topbar />
        <main className="mx-auto w-full max-w-[1560px] flex-1 px-3 pb-28 pt-3 sm:px-5 md:pb-6">{children}</main>
        <footer className="mb-24 hidden px-4 pb-4 md:mb-2 md:block">
          <div className="tp-stage relative overflow-hidden rounded-3xl px-6 py-6 text-center shadow-panel">
            <div aria-hidden className="tp-stars pointer-events-none absolute inset-0 opacity-70" />
            <div aria-hidden className="tp-halo pointer-events-none absolute -left-16 -top-24 h-56 w-72 rounded-full opacity-80" />
            <div aria-hidden className="tp-halo pointer-events-none absolute -right-12 bottom-[-90px] h-56 w-80 rounded-full opacity-70" />
            <div aria-hidden className="absolute right-5 top-1/2 hidden -translate-y-1/2 lg:block">
              <TwinRings size={132} opacity={0.22} />
            </div>
            <div className="relative flex flex-col items-center gap-2">
              <TwinPadLockup size={30} tone="light" />
              <p className="text-2xs font-bold uppercase tracking-[0.24em] text-ice-400">
                One Launchpad. Two Routes.
              </p>
              <p className="mt-1 max-w-xl text-2xs leading-relaxed text-white/70">
                Come for the colors, stay for the launches. Tokens are risky business — read before you sign.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
