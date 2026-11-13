"use client";

/**
 * LaunchPortals — TwinPad's two launch destinations as collectible portals.
 *
 * Path 01 — Pump.fun (bonding curve → PumpSwap) and Path 02 — Raydium
 * LaunchLab (bonding curve → CPMM). Each portal is an independent protocol:
 * TwinPad builds the route's real transaction and is NOT affiliated with
 * either protocol — the disclaimer line below stays on the page.
 *
 * Hover produces a soft 3D tilt (CSS only); the glow follows each route's
 * colorway. Buttons deep-link into the create flow with the route preset.
 */

import Link from "next/link";

export interface PortalSpec {
  route: "pump" | "launchlab";
  index: string;
  title: string;
  protocol: string;
  destination: string;
  blurb: string;
  cta: string;
  /** Tailwind gradient stops for the portal ring + card wash. */
  ring: string;
  wash: string;
  chip: string;
  glow: string;
}

export const TWINPAD_PORTALS: PortalSpec[] = [
  {
    route: "pump",
    index: "01",
    title: "Pump.fun",
    protocol: "Path 01 · Pump.fun",
    destination: "Bonding curve → PumpSwap",
    blurb:
      "Start your token on Pump.fun's bonding curve — 6 decimals, instant trading, and liquidity that moves to PumpSwap on its own when the curve fills.",
    cta: "Launch on Pump.fun",
    ring: "from-lagoon-400 via-lagoon-300 to-lagoon-500",
    wash: "from-lagoon-300/25 via-white to-lagoon-300/15 dark:from-lagoon-400/10 dark:via-transparent dark:to-lagoon-500/10",
    chip: "bg-lagoon-300/50 text-[#0B6E63] dark:bg-lagoon-400/15 dark:text-lagoon-300",
    glow: "shadow-[0_18px_50px_-18px_rgba(44,212,192,0.55)]",
  },
  {
    route: "launchlab",
    index: "02",
    title: "Raydium LaunchLab",
    protocol: "Path 02 · Raydium LaunchLab",
    destination: "Bonding curve → Raydium CPMM",
    blurb:
      "Build your launch on Raydium LaunchLab. Hit the funding goal and your token graduates straight into a Raydium CPMM pool.",
    cta: "Launch on LaunchLab",
    ring: "from-bloom-400 via-bloom-300 to-bloom-500",
    wash: "from-bloom-300/25 via-white to-bloom-300/15 dark:from-bloom-400/10 dark:via-transparent dark:to-bloom-500/10",
    chip: "bg-bloom-300/40 text-[#7A1C8F] dark:bg-bloom-400/15 dark:text-bloom-300",
    glow: "shadow-[0_18px_50px_-18px_rgba(216,72,240,0.6)]",
  },
];

function PortalArt({ spec }: { spec: PortalSpec }) {
  return (
    <div className="relative mx-auto h-28 w-28" aria-hidden="true">
      {/* glow halo */}
      <div className={`absolute -inset-4 rounded-full bg-gradient-to-br ${spec.ring} opacity-25 blur-2xl`} />
      {/* outer ring */}
      <div
        className={`tp-portal-spin absolute inset-0 rounded-full bg-gradient-to-br ${spec.ring}`}
        style={{ padding: 6 }}
      >
        <div className="h-full w-full rounded-full bg-white/85 dark:bg-[#1A1150]/85" />
      </div>
      {/* inner swirl */}
      <div
        className={`tp-portal-spin-rev absolute inset-[22%] rounded-full bg-gradient-to-tr ${spec.ring} opacity-80`}
      />
      <div className="absolute inset-[30%] rounded-full bg-white dark:bg-[#130B38]" />
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-2xl font-extrabold tracking-tight text-ink dark:text-white`}
      >
        {spec.index}
      </span>
    </div>
  );
}

export function LaunchPortalCard({ spec, compact = false }: { spec: PortalSpec; compact?: boolean }) {
  return (
    <Link
      href={`/create?route=${spec.route}`}
      className={`tp-tilt group relative flex flex-col items-center overflow-hidden rounded-3xl border border-night-700 bg-gradient-to-br ${spec.wash} p-6 text-center shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-transparent ${spec.glow}`}
    >
      <span className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-2xs font-bold uppercase tracking-widest ${spec.chip}`}>
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" />
        {spec.protocol}
      </span>
      <PortalArt spec={spec} />
      <h3 className="mt-5 font-display text-xl font-bold text-ink">{spec.title}</h3>
      <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${spec.chip.split(" ").slice(2).join(" ")}`}>
        {spec.destination}
      </p>
      {!compact && <p className="mt-3 max-w-sm text-sm leading-relaxed text-night-400">{spec.blurb}</p>}
      <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 group-hover:scale-[1.03] group-hover:bg-[#170B45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:bg-white dark:text-[#170B45] dark:group-hover:bg-[#EFECFF]">
        {spec.cta}
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="currentColor" aria-hidden="true">
          <path d="M6.2 3.4 10.8 8l-4.6 4.6-1.4-1.4L8 8 4.8 4.8z" />
        </svg>
      </span>
    </Link>
  );
}

export function LaunchPortals({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-label="Launch destinations" className="grid gap-4 sm:grid-cols-2">
      {TWINPAD_PORTALS.map((spec) => (
        <LaunchPortalCard key={spec.route} spec={spec} compact={compact} />
      ))}
    </section>
  );
}
