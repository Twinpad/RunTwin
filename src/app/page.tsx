import Link from "next/link";
import { Hero3D } from "@/components/three/hero-3d";
import { LaunchPortals } from "@/components/home/launch-portals";
import { TrendingPanel } from "@/components/dashboard/trending-panel";
import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { LeaderboardPanel } from "@/components/dashboard/leaderboard-panel";
import { LatestPanel } from "@/components/dashboard/latest-panel";
import { OfficialTokenCard } from "@/components/official/official-token-card";
import { getOfficialTokenConfig } from "@/lib/official-token/config";
import { officialTokenView } from "@/lib/official-token/token-display";

/**
 * TwinPad home — an immersive launch universe.
 *
 * The hero is a real 3D scene (floating islands, the Twinny mascot, two
 * launch portals, rocket fly-bys) rendered behind real content, gated by
 * device/reduced-motion detection with a CSS fallback. All live sections
 * below render REAL registry/trending data with honest empty states.
 *
 * Force-dynamic: the Official $TWIN address must reflect the CURRENT
 * TWINPAD_OFFICIAL_MINT configuration on every request.
 */
export const dynamic = "force-dynamic";

export default function TwinPadHomePage() {
  const officialToken = officialTokenView(getOfficialTokenConfig());
  return (
    <div className="animate-fade-up space-y-6">
      {/* Hero — the 3D launch universe */}
      <section className="relative overflow-hidden rounded-3xl border border-deep/40 bg-gradient-to-br from-deep via-[#3B1D8F] to-[#155E9C] shadow-panel">
        {/* Decorative 3D universe (CSS fallback on weak devices) */}
        <Hero3D dark={false} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_50%_120%,rgba(6,182,212,0.22),transparent_60%)]" />

        <div className="relative z-10 px-6 py-14 text-center sm:px-12 sm:py-20 lg:py-24">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-2xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan-300" />
            Solana · Two launch routes · Zero custody
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
            One Launchpad.
            <br />
            <span className="tp-gradient-text">Two Routes.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Your next big token starts here. Choose your launch route — Pump.fun
            or Raydium LaunchLab — and bring your community to life.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-extrabold text-[#2A1E4F] shadow-[0_14px_34px_-10px_rgba(255,255,255,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100"
            >
              Launch a Token
            </Link>
            <Link
              href="/tokens"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-extrabold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
            >
              Explore Tokens
            </Link>
          </div>
        </div>
      </section>

      {/* Two launch portals */}
      <LaunchPortals />
      <p className="text-center text-2xs leading-relaxed text-night-400">
        Pump.fun and Raydium are independent Solana protocols. TwinPad builds each
        route&apos;s transactions with the protocols&apos; official SDKs and is not
        affiliated with, endorsed by, or sponsored by either of them.
      </p>

      {/* Live universe — real registry + trending data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <TrendingPanel />
        </div>
        <div className="min-w-0">
          <ActivityPanel />
        </div>
        <div className="min-w-0">
          <LeaderboardPanel />
        </div>
        <div className="min-w-0">
          <LatestPanel />
        </div>
      </div>

      {/* Official $TWIN token — public CA display with honest status */}
      <section aria-label="Official $TWIN token" className="pt-2">
        <OfficialTokenCard initialView={officialToken} />
      </section>
    </div>
  );
}
